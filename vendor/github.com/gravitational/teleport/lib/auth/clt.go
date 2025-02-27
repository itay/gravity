/*
Copyright 2015 Gravitational, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package auth

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gravitational/teleport"
	"github.com/gravitational/teleport/lib/defaults"
	"github.com/gravitational/teleport/lib/events"
	"github.com/gravitational/teleport/lib/httplib"
	"github.com/gravitational/teleport/lib/services"
	"github.com/gravitational/teleport/lib/session"
	"github.com/gravitational/teleport/lib/utils"

	"github.com/gravitational/roundtrip"
	"github.com/gravitational/trace"
	"github.com/tstranex/u2f"
)

const (
	// CurrentVersion is a current API version
	CurrentVersion = services.V2

	// MissingNamespaceError is a _very_ common error this file generatets
	MissingNamespaceError = "missing required parameter: namespace"
)

type Dialer func(network, addr string) (net.Conn, error)

// Client is HTTP Auth API client. It works by connecting to auth servers
// via HTTP.
//
// When Teleport servers connect to auth API, they usually establish an SSH
// tunnel first, and then do HTTP-over-SSH. This client is wrapped by auth.TunClient
// in lib/auth/tun.go
type Client struct {
	tlsConfig   *tls.Config
	dialContext DialContext
	roundtrip.Client
	transport *http.Transport
}

// TLSConfig returns TLS config used by the client, could return nil
// if the client is not using TLS
func (c *Client) TLSConfig() *tls.Config {
	return c.tlsConfig
}

// DialContext is a function that dials to the specified address
type DialContext func(in context.Context, network, addr string) (net.Conn, error)

// EncodeClusterName encodes cluster name in the SNI hostname
func EncodeClusterName(clusterName string) string {
	// hex is used to hide "." that will prevent wildcard *. entry to match
	return fmt.Sprintf("%v.%v", hex.EncodeToString([]byte(clusterName)), teleport.APIDomain)
}

// DecodeClusterName decodes cluster name, returns NotFound
// if no cluster name is encoded (empty subdomain),
// so servers can detect cases when no server name passed
// returns BadParameter if encoding does not match
func DecodeClusterName(serverName string) (string, error) {
	if serverName == teleport.APIDomain {
		return "", trace.NotFound("no cluster name is encoded")
	}
	const suffix = "." + teleport.APIDomain
	if !strings.HasSuffix(serverName, suffix) {
		return "", trace.BadParameter("unrecognized name, expected suffix %v, got %q", teleport.APIDomain, serverName)
	}
	clusterName := strings.TrimSuffix(serverName, suffix)

	decoded, err := hex.DecodeString(clusterName)
	if err != nil {
		return "", trace.BadParameter("failed to decode cluster name: %v", err)
	}
	return string(decoded), nil
}

// NewAddrDialer returns new dialer from a list of addresses
func NewAddrDialer(addrs []utils.NetAddr) DialContext {
	dialer := net.Dialer{
		Timeout:   defaults.DefaultDialTimeout,
		KeepAlive: defaults.ReverseTunnelAgentHeartbeatPeriod,
	}
	return func(in context.Context, network, _ string) (net.Conn, error) {
		var err error
		var conn net.Conn
		for _, addr := range addrs {
			conn, err = dialer.DialContext(in, network, addr.Addr)
			if err == nil {
				return conn, nil
			}
			log.Debugf("Failed to dial auth server %v: %v.", addr.Addr, err)
		}
		// not wrapping on purpose to preserve the original error
		return nil, err
	}
}

// ClientTimeout sets idle and dial timeouts of the HTTP transport
// used by the client.
func ClientTimeout(timeout time.Duration) roundtrip.ClientParam {
	return func(c *roundtrip.Client) error {
		transport, ok := (c.HTTPClient().Transport).(*http.Transport)
		if !ok {
			return nil
		}
		transport.IdleConnTimeout = timeout
		transport.ResponseHeaderTimeout = timeout
		return nil
	}
}

// NewTLSClientWithDialer returns new TLS client that uses mutual TLS authenticate
// and dials the remote server using dialer
func NewTLSClientWithDialer(dialContext DialContext, cfg *tls.Config, params ...roundtrip.ClientParam) (*Client, error) {
	if cfg.ServerName == "" {
		cfg.ServerName = teleport.APIDomain
	}
	transport := &http.Transport{
		// notice that below roundtrip.Client is passed
		// teleport.APIEndpoint as an address for the API server, this is
		// to make sure client verifies the DNS name of the API server
		// custom DialContext overrides this DNS name to the real address
		// in addition this dialer tries multiple adresses if provided
		DialContext:           dialContext,
		ResponseHeaderTimeout: defaults.DefaultDialTimeout,
		TLSClientConfig:       cfg,

		// Increase the size of the connection pool. This substantially improves the
		// performance of Teleport under load as it reduces the number of TLS
		// handshakes performed.
		MaxIdleConns:        defaults.HTTPMaxIdleConns,
		MaxIdleConnsPerHost: defaults.HTTPMaxIdleConnsPerHost,

		// IdleConnTimeout defines the maximum amount of time before idle connections
		// are closed. Leaving this unset will lead to connections open forever and
		// will cause memory leaks in a long running process.
		IdleConnTimeout: defaults.HTTPIdleTimeout,
	}
	// this logic is necessary to force client to always send certificate
	// regardless of the server setting, otherwise client may pick
	// not to send the client certificate by looking at certificate request
	if len(cfg.Certificates) != 0 {
		cert := cfg.Certificates[0]
		cfg.Certificates = nil
		cfg.GetClientCertificate = func(_ *tls.CertificateRequestInfo) (*tls.Certificate, error) {
			return &cert, nil
		}
	}

	clientParams := append(
		[]roundtrip.ClientParam{
			roundtrip.HTTPClient(&http.Client{Transport: transport}),
			roundtrip.SanitizerEnabled(true),
		},
		params...,
	)
	roundtripClient, err := roundtrip.NewClient("https://"+teleport.APIDomain, CurrentVersion, clientParams...)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return &Client{
		tlsConfig:   cfg,
		dialContext: dialContext,
		Client:      *roundtripClient,
		transport:   transport,
	}, nil
}

// NewTLSClient returns new client using TLS mutual authentication
func NewTLSClient(addrs []utils.NetAddr, cfg *tls.Config, params ...roundtrip.ClientParam) (*Client, error) {
	return NewTLSClientWithDialer(NewAddrDialer(addrs), cfg, params...)
}

// NewAuthClient returns a new instance of the client which talks to
// an Auth server API (aka "site API") via HTTP-over-SSH
func NewClient(addr string, dialer Dialer, params ...roundtrip.ClientParam) (*Client, error) {
	if dialer == nil {
		dialer = net.Dial
	}
	transport := &http.Transport{
		Dial: dialer,
		ResponseHeaderTimeout: defaults.DefaultDialTimeout,
	}
	params = append(params,
		roundtrip.HTTPClient(&http.Client{
			Transport: transport,
		}),
		roundtrip.SanitizerEnabled(true),
		// TODO (ekontsevoy) this tracer pollutes the logs making it harder to work
		// on issues that have nothing to do with the auth API, consider activating it
		// via special environment variable?
		// roundtrip.Tracer(NewTracer),
	)

	c, err := roundtrip.NewClient(addr, CurrentVersion, params...)
	if err != nil {
		return nil, err
	}
	return &Client{
		Client:    *c,
		transport: transport,
	}, nil
}

func (c *Client) GetTransport() *http.Transport {
	return c.transport
}

// PostJSON is a generic method that issues http POST request to the server
func (c *Client) PostJSON(
	endpoint string, val interface{}) (*roundtrip.Response, error) {
	return httplib.ConvertResponse(c.Client.PostJSON(context.TODO(), endpoint, val))
}

// PutJSON is a generic method that issues http PUT request to the server
func (c *Client) PutJSON(
	endpoint string, val interface{}) (*roundtrip.Response, error) {
	return httplib.ConvertResponse(c.Client.PutJSON(context.TODO(), endpoint, val))
}

// PostForm is a generic method that issues http POST request to the server
func (c *Client) PostForm(
	endpoint string,
	vals url.Values,
	files ...roundtrip.File) (*roundtrip.Response, error) {

	return httplib.ConvertResponse(c.Client.PostForm(context.TODO(), endpoint, vals, files...))
}

// Get issues http GET request to the server
func (c *Client) Get(u string, params url.Values) (*roundtrip.Response, error) {
	return httplib.ConvertResponse(c.Client.Get(context.TODO(), u, params))
}

// Delete issues http Delete Request to the server
func (c *Client) Delete(u string) (*roundtrip.Response, error) {
	return httplib.ConvertResponse(c.Client.Delete(context.TODO(), u))
}

// ProcessKubeCSR processes CSR request against Kubernetes CA, returns
// signed certificate if sucessful.
func (c *Client) ProcessKubeCSR(req KubeCSR) (*KubeCSRResponse, error) {
	if err := req.CheckAndSetDefaults(); err != nil {
		return nil, trace.Wrap(err)
	}
	out, err := c.PostJSON(c.Endpoint("kube", "csr"), req)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var re KubeCSRResponse
	if err := json.Unmarshal(out.Bytes(), &re); err != nil {
		return nil, trace.Wrap(err)
	}
	return &re, nil
}

// GetSessions returns a list of active sessions in the cluster
// as reported by auth server
func (c *Client) GetSessions(namespace string) ([]session.Session, error) {
	if namespace == "" {
		return nil, trace.BadParameter(MissingNamespaceError)
	}
	out, err := c.Get(c.Endpoint("namespaces", namespace, "sessions"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var sessions []session.Session
	if err := json.Unmarshal(out.Bytes(), &sessions); err != nil {
		return nil, err
	}
	return sessions, nil
}

// GetSession returns a session by ID
func (c *Client) GetSession(namespace string, id session.ID) (*session.Session, error) {
	if namespace == "" {
		return nil, trace.BadParameter(MissingNamespaceError)
	}
	// saving extra round-trip
	if err := id.Check(); err != nil {
		return nil, trace.Wrap(err)
	}
	out, err := c.Get(c.Endpoint("namespaces", namespace, "sessions", string(id)), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var sess *session.Session
	if err := json.Unmarshal(out.Bytes(), &sess); err != nil {
		return nil, trace.Wrap(err)
	}
	return sess, nil
}

// DeleteSession removes an active session from the backend.
func (c *Client) DeleteSession(namespace string, id session.ID) error {
	if namespace == "" {
		return trace.BadParameter(MissingNamespaceError)
	}
	_, err := c.Delete(c.Endpoint("namespaces", namespace, "sessions", string(id)))
	return trace.Wrap(err)
}

// CreateSession creates new session
func (c *Client) CreateSession(sess session.Session) error {
	if sess.Namespace == "" {
		return trace.BadParameter(MissingNamespaceError)
	}
	_, err := c.PostJSON(c.Endpoint("namespaces", sess.Namespace, "sessions"), createSessionReq{Session: sess})
	return trace.Wrap(err)
}

// UpdateSession updates existing session
func (c *Client) UpdateSession(req session.UpdateRequest) error {
	if err := req.Check(); err != nil {
		return trace.Wrap(err)
	}
	_, err := c.PutJSON(c.Endpoint("namespaces", req.Namespace, "sessions", string(req.ID)), updateSessionReq{Update: req})
	return trace.Wrap(err)
}

// GetDomainName returns local auth domain of the current auth server
func (c *Client) GetDomainName() (string, error) {
	out, err := c.Get(c.Endpoint("domain"), url.Values{})
	if err != nil {
		return "", trace.Wrap(err)
	}
	var domain string
	if err := json.Unmarshal(out.Bytes(), &domain); err != nil {
		return "", trace.Wrap(err)
	}
	return domain, nil
}

// GetClusterCACert returns the CAs for the local cluster without signing keys.
func (c *Client) GetClusterCACert() (*LocalCAResponse, error) {
	out, err := c.Get(c.Endpoint("cacert"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var localCA LocalCAResponse
	if err := json.Unmarshal(out.Bytes(), &localCA); err != nil {
		return nil, trace.Wrap(err)
	}
	return &localCA, nil
}

func (c *Client) Close() error {
	return nil
}

func (c *Client) WaitForDelivery(context.Context) error {
	return nil
}

// CreateCertAuthority inserts new cert authority
func (c *Client) CreateCertAuthority(ca services.CertAuthority) error {
	return trace.BadParameter("not implemented")
}

// RotateCertAuthority starts or restarts certificate authority rotation process.
func (c *Client) RotateCertAuthority(req RotateRequest) error {
	caType := "all"
	if req.Type != "" {
		caType = string(req.Type)
	}
	_, err := c.PostJSON(c.Endpoint("authorities", caType, "rotate"), req)
	return trace.Wrap(err)
}

// RotateExternalCertAuthority rotates external certificate authority,
// this method is used to update only public keys and certificates of the
// the certificate authorities of trusted clusters.
func (c *Client) RotateExternalCertAuthority(ca services.CertAuthority) error {
	if err := ca.Check(); err != nil {
		return trace.Wrap(err)
	}
	data, err := services.GetCertAuthorityMarshaler().MarshalCertAuthority(ca)
	if err != nil {
		return trace.Wrap(err)
	}
	_, err = c.PostJSON(c.Endpoint("authorities", string(ca.GetType()), "rotate", "external"),
		&rotateExternalCertAuthorityRawReq{CA: data})
	return trace.Wrap(err)
}

// UpsertCertAuthority updates or inserts new cert authority
func (c *Client) UpsertCertAuthority(ca services.CertAuthority) error {
	if err := ca.Check(); err != nil {
		return trace.Wrap(err)
	}
	data, err := services.GetCertAuthorityMarshaler().MarshalCertAuthority(ca)
	if err != nil {
		return trace.Wrap(err)
	}
	_, err = c.PostJSON(c.Endpoint("authorities", string(ca.GetType())),
		&upsertCertAuthorityRawReq{CA: data})
	return trace.Wrap(err)
}

// CompareAndSwapCertAuthority updates existing cert authority if the existing cert authority
// value matches the value stored in the backend.
func (c *Client) CompareAndSwapCertAuthority(new, existing services.CertAuthority) error {
	return trace.BadParameter("this function is not supported on the client")
}

// GetCertAuthorities returns a list of certificate authorities
func (c *Client) GetCertAuthorities(caType services.CertAuthType, loadKeys bool, opts ...services.MarshalOption) ([]services.CertAuthority, error) {
	if err := caType.Check(); err != nil {
		return nil, trace.Wrap(err)
	}
	out, err := c.Get(c.Endpoint("authorities", string(caType)), url.Values{
		"load_keys": []string{fmt.Sprintf("%t", loadKeys)},
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, err
	}
	re := make([]services.CertAuthority, len(items))
	for i, raw := range items {
		ca, err := services.GetCertAuthorityMarshaler().UnmarshalCertAuthority(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		re[i] = ca
	}
	return re, nil
}

// GetCertAuthority returns certificate authority by given id. Parameter loadSigningKeys
// controls if signing keys are loaded
func (c *Client) GetCertAuthority(id services.CertAuthID, loadSigningKeys bool, opts ...services.MarshalOption) (services.CertAuthority, error) {
	if err := id.Check(); err != nil {
		return nil, trace.Wrap(err)
	}
	out, err := c.Get(c.Endpoint("authorities", string(id.Type), id.DomainName), url.Values{
		"load_keys": []string{fmt.Sprintf("%t", loadSigningKeys)},
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetCertAuthorityMarshaler().UnmarshalCertAuthority(out.Bytes())
}

// DeleteCertAuthority deletes cert authority by ID
func (c *Client) DeleteCertAuthority(id services.CertAuthID) error {
	if err := id.Check(); err != nil {
		return trace.Wrap(err)
	}
	_, err := c.Delete(c.Endpoint("authorities", string(id.Type), id.DomainName))
	return trace.Wrap(err)
}

// ActivateCertAuthority moves a CertAuthority from the deactivated list to
// the normal list.
func (c *Client) ActivateCertAuthority(id services.CertAuthID) error {
	return trace.BadParameter("not implemented")
}

// DeactivateCertAuthority moves a CertAuthority from the normal list to
// the deactivated list.
func (c *Client) DeactivateCertAuthority(id services.CertAuthID) error {
	return trace.BadParameter("not implemented")
}

// GenerateToken creates a special provisioning token for a new SSH server
// that is valid for ttl period seconds.
//
// This token is used by SSH server to authenticate with Auth server
// and get signed certificate and private key from the auth server.
//
// If token is not supplied, it will be auto generated and returned.
// If TTL is not supplied, token will be valid until removed.
func (c *Client) GenerateToken(req GenerateTokenRequest) (string, error) {
	out, err := c.PostJSON(c.Endpoint("tokens"), req)
	if err != nil {
		return "", trace.Wrap(err)
	}
	var token string
	if err := json.Unmarshal(out.Bytes(), &token); err != nil {
		return "", trace.Wrap(err)
	}
	return token, nil
}

// RegisterUsingToken calls the auth service API to register a new node using a registration token
// which was previously issued via GenerateToken.
func (c *Client) RegisterUsingToken(req RegisterUsingTokenRequest) (*PackedKeys, error) {
	if err := req.CheckAndSetDefaults(); err != nil {
		return nil, trace.Wrap(err)
	}
	out, err := c.PostJSON(c.Endpoint("tokens", "register"), req)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var keys PackedKeys
	if err := json.Unmarshal(out.Bytes(), &keys); err != nil {
		return nil, trace.Wrap(err)
	}
	return &keys, nil
}

// RenewCredentials returns a new set of credentials associated
// with the server with the same privileges
func (c *Client) GenerateServerKeys(req GenerateServerKeysRequest) (*PackedKeys, error) {
	if err := req.CheckAndSetDefaults(); err != nil {
		return nil, trace.Wrap(err)
	}
	out, err := c.PostJSON(c.Endpoint("server", "credentials"), req)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var keys PackedKeys
	if err := json.Unmarshal(out.Bytes(), &keys); err != nil {
		return nil, trace.Wrap(err)
	}

	return &keys, nil
}

// GetTokens returns a list of active invitation tokens for nodes and users
func (c *Client) GetTokens() (tokens []services.ProvisionToken, err error) {
	out, err := c.Get(c.Endpoint("tokens"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	if err := json.Unmarshal(out.Bytes(), &tokens); err != nil {
		return nil, trace.Wrap(err)
	}
	return tokens, nil
}

// GetToken returns provisioning token
func (c *Client) GetToken(token string) (*services.ProvisionToken, error) {
	out, err := c.Get(c.Endpoint("tokens", token), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var tok services.ProvisionToken
	if err := json.Unmarshal(out.Bytes(), &tok); err != nil {
		return nil, trace.Wrap(err)
	}
	return &tok, nil
}

// DeleteToken deletes a given provisioning token on the auth server (CA). It
// could be a user token or a machine token
func (c *Client) DeleteToken(token string) error {
	_, err := c.Delete(c.Endpoint("tokens", token))
	return trace.Wrap(err)
}

// RegisterNewAuthServer is used to register new auth server with token
func (c *Client) RegisterNewAuthServer(token string) error {
	_, err := c.PostJSON(c.Endpoint("tokens", "register", "auth"), registerNewAuthServerReq{
		Token: token,
	})
	return trace.Wrap(err)
}

// UpsertNode is used by SSH servers to reprt their presence
// to the auth servers in form of hearbeat expiring after ttl period.
func (c *Client) UpsertNode(s services.Server) error {
	if s.GetNamespace() == "" {
		return trace.BadParameter("missing node namespace")
	}
	data, err := services.GetServerMarshaler().MarshalServer(s)
	if err != nil {
		return trace.Wrap(err)
	}
	args := &upsertServerRawReq{
		Server: data,
	}
	_, err = c.PostJSON(c.Endpoint("namespaces", s.GetNamespace(), "nodes"), args)
	return trace.Wrap(err)
}

// UpsertNodes bulk inserts nodes.
func (c *Client) UpsertNodes(namespace string, servers []services.Server) error {
	if namespace == "" {
		return trace.BadParameter("missing node namespace")
	}

	bytes, err := services.GetServerMarshaler().MarshalServers(servers)
	if err != nil {
		return trace.Wrap(err)
	}
	args := &upsertNodesReq{
		Namespace: namespace,
		Nodes:     bytes,
	}
	_, err = c.PutJSON(c.Endpoint("namespaces", namespace, "nodes"), args)
	return trace.Wrap(err)
}

// GetNodes returns the list of servers registered in the cluster.
func (c *Client) GetNodes(namespace string, opts ...services.MarshalOption) ([]services.Server, error) {
	if namespace == "" {
		return nil, trace.BadParameter(MissingNamespaceError)
	}
	cfg, err := services.CollectOptions(opts)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	out, err := c.Get(c.Endpoint("namespaces", namespace, "nodes"), url.Values{
		"skip_validation": []string{fmt.Sprintf("%t", cfg.SkipValidation)},
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}

	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	re := make([]services.Server, len(items))
	for i, raw := range items {
		s, err := services.GetServerMarshaler().UnmarshalServer(
			raw,
			services.KindNode,
			opts...)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		re[i] = s
	}

	return re, nil
}

// UpsertReverseTunnel is used by admins to create a new reverse tunnel
// to the remote proxy to bypass firewall restrictions
func (c *Client) UpsertReverseTunnel(tunnel services.ReverseTunnel) error {
	data, err := services.GetReverseTunnelMarshaler().MarshalReverseTunnel(tunnel)
	if err != nil {
		return trace.Wrap(err)
	}
	args := &upsertReverseTunnelRawReq{
		ReverseTunnel: data,
	}
	_, err = c.PostJSON(c.Endpoint("reversetunnels"), args)
	return trace.Wrap(err)
}

// GetReverseTunnel returns reverse tunnel by name
func (c *Client) GetReverseTunnel(name string) (services.ReverseTunnel, error) {
	return nil, trace.BadParameter("not implemented")
}

// GetReverseTunnels returns the list of created reverse tunnels
func (c *Client) GetReverseTunnels() ([]services.ReverseTunnel, error) {
	out, err := c.Get(c.Endpoint("reversetunnels"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	tunnels := make([]services.ReverseTunnel, len(items))
	for i, raw := range items {
		tunnel, err := services.GetReverseTunnelMarshaler().UnmarshalReverseTunnel(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		tunnels[i] = tunnel
	}
	return tunnels, nil
}

// DeleteReverseTunnel deletes reverse tunnel by domain name
func (c *Client) DeleteReverseTunnel(domainName string) error {
	// this is to avoid confusing error in case if domain empty for example
	// HTTP route will fail producing generic not found error
	// instead we catch the error here
	if strings.TrimSpace(domainName) == "" {
		return trace.BadParameter("empty domain name")
	}
	_, err := c.Delete(c.Endpoint("reversetunnels", domainName))
	return trace.Wrap(err)
}

// UpsertTunnelConnection upserts tunnel connection
func (c *Client) UpsertTunnelConnection(conn services.TunnelConnection) error {
	data, err := services.MarshalTunnelConnection(conn)
	if err != nil {
		return trace.Wrap(err)
	}
	args := &upsertTunnelConnectionRawReq{
		TunnelConnection: data,
	}
	_, err = c.PostJSON(c.Endpoint("tunnelconnections"), args)
	return trace.Wrap(err)
}

// GetTunnelConnections returns tunnel connections for a given cluster
func (c *Client) GetTunnelConnections(clusterName string, opts ...services.MarshalOption) ([]services.TunnelConnection, error) {
	if clusterName == "" {
		return nil, trace.BadParameter("missing cluster name parameter")
	}
	out, err := c.Get(c.Endpoint("tunnelconnections", clusterName), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	conns := make([]services.TunnelConnection, len(items))
	for i, raw := range items {
		conn, err := services.UnmarshalTunnelConnection(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		conns[i] = conn
	}
	return conns, nil
}

// GetAllTunnelConnections returns all tunnel connections
func (c *Client) GetAllTunnelConnections(opts ...services.MarshalOption) ([]services.TunnelConnection, error) {
	out, err := c.Get(c.Endpoint("tunnelconnections"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	conns := make([]services.TunnelConnection, len(items))
	for i, raw := range items {
		conn, err := services.UnmarshalTunnelConnection(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		conns[i] = conn
	}
	return conns, nil
}

// DeleteTunnelConnection deletes tunnel connection by name
func (c *Client) DeleteTunnelConnection(clusterName string, connName string) error {
	if clusterName == "" {
		return trace.BadParameter("missing parameter cluster name")
	}
	if connName == "" {
		return trace.BadParameter("missing parameter connection name")
	}
	_, err := c.Delete(c.Endpoint("tunnelconnections", clusterName, connName))
	return trace.Wrap(err)
}

// DeleteTunnelConnections deletes all tunnel connections for cluster
func (c *Client) DeleteTunnelConnections(clusterName string) error {
	if clusterName == "" {
		return trace.BadParameter("missing parameter cluster name")
	}
	_, err := c.Delete(c.Endpoint("tunnelconnections", clusterName))
	return trace.Wrap(err)
}

// DeleteAllTunnelConnections deletes all tunnel connections
func (c *Client) DeleteAllTunnelConnections() error {
	_, err := c.Delete(c.Endpoint("tunnelconnections"))
	return trace.Wrap(err)
}

// AddUserLoginAttempt logs user login attempt
func (c *Client) AddUserLoginAttempt(user string, attempt services.LoginAttempt, ttl time.Duration) error {
	panic("not implemented")
}

// GetUserLoginAttempts returns user login attempts
func (c *Client) GetUserLoginAttempts(user string) ([]services.LoginAttempt, error) {
	panic("not implemented")
}

// GetRemoteClusters returns a list of remote clusters
func (c *Client) GetRemoteClusters(opts ...services.MarshalOption) ([]services.RemoteCluster, error) {
	out, err := c.Get(c.Endpoint("remoteclusters"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	conns := make([]services.RemoteCluster, len(items))
	for i, raw := range items {
		conn, err := services.UnmarshalRemoteCluster(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		conns[i] = conn
	}
	return conns, nil
}

// GetRemoteCluster returns a remote cluster by name
func (c *Client) GetRemoteCluster(clusterName string) (services.RemoteCluster, error) {
	if clusterName == "" {
		return nil, trace.BadParameter("missing cluster name")
	}
	out, err := c.Get(c.Endpoint("remoteclusters", clusterName), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.UnmarshalRemoteCluster(out.Bytes())
}

// DeleteRemoteCluster deletes remote cluster by name
func (c *Client) DeleteRemoteCluster(clusterName string) error {
	if clusterName == "" {
		return trace.BadParameter("missing parameter cluster name")
	}
	_, err := c.Delete(c.Endpoint("remoteclusters", clusterName))
	return trace.Wrap(err)
}

// DeleteAllRemoteClusters deletes all remote clusters
func (c *Client) DeleteAllRemoteClusters() error {
	_, err := c.Delete(c.Endpoint("remoteclusters"))
	return trace.Wrap(err)
}

// CreateRemoteCluster creates remote cluster resource
func (c *Client) CreateRemoteCluster(rc services.RemoteCluster) error {
	data, err := services.MarshalRemoteCluster(rc)
	if err != nil {
		return trace.Wrap(err)
	}
	args := &createRemoteClusterRawReq{
		RemoteCluster: data,
	}
	_, err = c.PostJSON(c.Endpoint("remoteclusters"), args)
	return trace.Wrap(err)
}

// UpsertAuthServer is used by auth servers to report their presence
// to other auth servers in form of hearbeat expiring after ttl period.
func (c *Client) UpsertAuthServer(s services.Server) error {
	data, err := services.GetServerMarshaler().MarshalServer(s)
	if err != nil {
		return trace.Wrap(err)
	}
	args := &upsertServerRawReq{
		Server: data,
	}
	_, err = c.PostJSON(c.Endpoint("authservers"), args)
	return trace.Wrap(err)
}

// GetAuthServers returns the list of auth servers registered in the cluster.
func (c *Client) GetAuthServers() ([]services.Server, error) {
	out, err := c.Get(c.Endpoint("authservers"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	re := make([]services.Server, len(items))
	for i, raw := range items {
		server, err := services.GetServerMarshaler().UnmarshalServer(raw, services.KindAuthServer)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		re[i] = server
	}
	return re, nil
}

// UpsertProxy is used by proxies to report their presence
// to other auth servers in form of hearbeat expiring after ttl period.
func (c *Client) UpsertProxy(s services.Server) error {
	data, err := services.GetServerMarshaler().MarshalServer(s)
	if err != nil {
		return trace.Wrap(err)
	}
	args := &upsertServerRawReq{
		Server: data,
	}
	_, err = c.PostJSON(c.Endpoint("proxies"), args)
	return trace.Wrap(err)
}

// GetProxies returns the list of auth servers registered in the cluster.
func (c *Client) GetProxies() ([]services.Server, error) {
	out, err := c.Get(c.Endpoint("proxies"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	re := make([]services.Server, len(items))
	for i, raw := range items {
		server, err := services.GetServerMarshaler().UnmarshalServer(raw, services.KindProxy)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		re[i] = server
	}
	return re, nil
}

// GetU2FAppID returns U2F settings, like App ID and Facets
func (c *Client) GetU2FAppID() (string, error) {
	out, err := c.Get(c.Endpoint("u2f", "appID"), url.Values{})
	if err != nil {
		return "", trace.Wrap(err)
	}
	var appid string
	if err := json.Unmarshal(out.Bytes(), &appid); err != nil {
		return "", trace.Wrap(err)
	}
	return appid, nil
}

// UpsertPassword updates web access password for the user
func (c *Client) UpsertPassword(user string, password []byte) error {
	_, err := c.PostJSON(
		c.Endpoint("users", user, "web", "password"),
		upsertPasswordReq{
			Password: string(password),
		})
	if err != nil {
		return trace.Wrap(err)
	}

	return nil
}

// UpsertUser user updates or inserts user entry
func (c *Client) UpsertUser(user services.User) error {
	data, err := services.GetUserMarshaler().MarshalUser(user)
	if err != nil {
		return trace.Wrap(err)
	}
	_, err = c.PostJSON(c.Endpoint("users"), &upsertUserRawReq{User: data})
	return trace.Wrap(err)
}

// ChangePassword changes user password
func (c *Client) ChangePassword(req services.ChangePasswordReq) error {
	_, err := c.PutJSON(c.Endpoint("users", req.User, "web", "password"), req)
	return trace.Wrap(err)
}

// CheckPassword checks if the suplied web access password is valid.
func (c *Client) CheckPassword(user string, password []byte, otpToken string) error {
	_, err := c.PostJSON(
		c.Endpoint("users", user, "web", "password", "check"),
		checkPasswordReq{
			Password: string(password),
			OTPToken: otpToken,
		})
	return trace.Wrap(err)
}

// GetU2FSignRequest generates request for user trying to authenticate with U2F token
func (c *Client) GetU2FSignRequest(user string, password []byte) (*u2f.SignRequest, error) {
	out, err := c.PostJSON(
		c.Endpoint("u2f", "users", user, "sign"),
		signInReq{
			Password: string(password),
		},
	)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var signRequest *u2f.SignRequest
	if err := json.Unmarshal(out.Bytes(), &signRequest); err != nil {
		return nil, err
	}
	return signRequest, nil
}

// ExtendWebSession creates a new web session for a user based on another
// valid web session
func (c *Client) ExtendWebSession(user string, prevSessionID string) (services.WebSession, error) {
	out, err := c.PostJSON(
		c.Endpoint("users", user, "web", "sessions"),
		createWebSessionReq{
			PrevSessionID: prevSessionID,
		},
	)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetWebSessionMarshaler().UnmarshalWebSession(out.Bytes())
}

// CreateWebSession creates a new web session for a user
func (c *Client) CreateWebSession(user string) (services.WebSession, error) {
	out, err := c.PostJSON(
		c.Endpoint("users", user, "web", "sessions"),
		createWebSessionReq{},
	)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetWebSessionMarshaler().UnmarshalWebSession(out.Bytes())
}

// AuthenticateWebUser authenticates web user, creates and  returns web session
// in case if authentication is successful
func (c *Client) AuthenticateWebUser(req AuthenticateUserRequest) (services.WebSession, error) {
	out, err := c.PostJSON(
		c.Endpoint("users", req.Username, "web", "authenticate"),
		req,
	)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetWebSessionMarshaler().UnmarshalWebSession(out.Bytes())
}

// AuthenticateSSHUser authenticates SSH console user, creates and  returns a pair of signed TLS and SSH
// short lived certificates as a result
func (c *Client) AuthenticateSSHUser(req AuthenticateSSHRequest) (*SSHLoginResponse, error) {
	out, err := c.PostJSON(
		c.Endpoint("users", req.Username, "ssh", "authenticate"),
		req,
	)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var re SSHLoginResponse
	if err := json.Unmarshal(out.Bytes(), &re); err != nil {
		return nil, trace.Wrap(err)
	}
	return &re, nil
}

// GetWebSessionInfo checks if a web sesion is valid, returns session id in case if
// it is valid, or error otherwise.
func (c *Client) GetWebSessionInfo(user string, sid string) (services.WebSession, error) {
	out, err := c.Get(
		c.Endpoint("users", user, "web", "sessions", sid), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetWebSessionMarshaler().UnmarshalWebSession(out.Bytes())
}

// DeleteWebSession deletes a web session for this user by id
func (c *Client) DeleteWebSession(user string, sid string) error {
	_, err := c.Delete(c.Endpoint("users", user, "web", "sessions", sid))
	return trace.Wrap(err)
}

// GetUser returns a list of usernames registered in the system
func (c *Client) GetUser(name string) (services.User, error) {
	if name == "" {
		return nil, trace.BadParameter("missing username")
	}
	out, err := c.Get(c.Endpoint("users", name), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	user, err := services.GetUserMarshaler().UnmarshalUser(out.Bytes())
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return user, nil
}

// GetUsers returns a list of usernames registered in the system
func (c *Client) GetUsers() ([]services.User, error) {
	out, err := c.Get(c.Endpoint("users"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	users := make([]services.User, len(items))
	for i, userBytes := range items {
		user, err := services.GetUserMarshaler().UnmarshalUser(userBytes)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		users[i] = user
	}
	return users, nil
}

// DeleteUser deletes a user by username
func (c *Client) DeleteUser(user string) error {
	_, err := c.Delete(c.Endpoint("users", user))
	return trace.Wrap(err)
}

// GenerateKeyPair generates SSH private/public key pair optionally protected
// by password. If the pass parameter is an empty string, the key pair
// is not password-protected.
func (c *Client) GenerateKeyPair(pass string) ([]byte, []byte, error) {
	out, err := c.PostJSON(c.Endpoint("keypair"), generateKeyPairReq{Password: pass})
	if err != nil {
		return nil, nil, trace.Wrap(err)
	}
	var kp *generateKeyPairResponse
	if err := json.Unmarshal(out.Bytes(), &kp); err != nil {
		return nil, nil, err
	}
	return kp.PrivKey, []byte(kp.PubKey), err
}

// GenerateHostCert takes the public key in the Open SSH ``authorized_keys``
// plain text format, signs it using Host Certificate Authority private key and returns the
// resulting certificate.
func (c *Client) GenerateHostCert(
	key []byte, hostID, nodeName string, principals []string, clusterName string, roles teleport.Roles, ttl time.Duration) ([]byte, error) {

	out, err := c.PostJSON(c.Endpoint("ca", "host", "certs"),
		generateHostCertReq{
			Key:         key,
			HostID:      hostID,
			NodeName:    nodeName,
			Principals:  principals,
			ClusterName: clusterName,
			Roles:       roles,
			TTL:         ttl,
		})
	if err != nil {
		return nil, trace.Wrap(err)
	}

	var cert string
	if err := json.Unmarshal(out.Bytes(), &cert); err != nil {
		return nil, err
	}

	return []byte(cert), nil
}

// CreateSignupToken creates one time token for creating account for the user
// For each token it creates username and otp generator
func (c *Client) CreateSignupToken(user services.UserV1, ttl time.Duration) (string, error) {
	if err := user.Check(); err != nil {
		return "", trace.Wrap(err)
	}
	out, err := c.PostJSON(c.Endpoint("signuptokens"), createSignupTokenReq{
		User: user,
		TTL:  ttl,
	})
	if err != nil {
		return "", trace.Wrap(err)
	}
	var token string
	if err := json.Unmarshal(out.Bytes(), &token); err != nil {
		return "", trace.Wrap(err)
	}
	return token, nil
}

// GetSignupTokenData returns token data for a valid token
func (c *Client) GetSignupTokenData(token string) (user string, otpQRCode []byte, e error) {
	out, err := c.Get(c.Endpoint("signuptokens", token), url.Values{})
	if err != nil {
		return "", nil, err
	}

	var tokenData getSignupTokenDataResponse
	if err := json.Unmarshal(out.Bytes(), &tokenData); err != nil {
		return "", nil, err
	}

	return tokenData.User, tokenData.QRImg, nil
}

// GenerateUserCert takes the public key in the OpenSSH `authorized_keys` plain
// text format, signs it using User Certificate Authority signing key and
// returns the resulting certificate.
func (c *Client) GenerateUserCert(key []byte, user string, ttl time.Duration, compatibility string) ([]byte, error) {
	out, err := c.PostJSON(c.Endpoint("ca", "user", "certs"),
		generateUserCertReq{
			Key:           key,
			User:          user,
			TTL:           ttl,
			Compatibility: compatibility,
		})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var cert string
	if err := json.Unmarshal(out.Bytes(), &cert); err != nil {
		return nil, trace.Wrap(err)
	}
	return []byte(cert), nil
}

// GetSignupU2FRegisterRequest generates sign request for user trying to sign up with invite tokenx
func (c *Client) GetSignupU2FRegisterRequest(token string) (u2fRegisterRequest *u2f.RegisterRequest, e error) {
	out, err := c.Get(c.Endpoint("u2f", "signuptokens", token), url.Values{})
	if err != nil {
		return nil, err
	}
	var u2fRegReq u2f.RegisterRequest
	if err := json.Unmarshal(out.Bytes(), &u2fRegReq); err != nil {
		return nil, err
	}
	return &u2fRegReq, nil
}

// CreateUserWithOTP creates account with provided token and password.
// Account username and OTP key are taken from token data.
// Deletes token after account creation.
func (c *Client) CreateUserWithOTP(token, password, otpToken string) (services.WebSession, error) {
	out, err := c.PostJSON(c.Endpoint("signuptokens", "users"), createUserWithTokenReq{
		Token:    token,
		Password: password,
		OTPToken: otpToken,
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetWebSessionMarshaler().UnmarshalWebSession(out.Bytes())
}

// CreateUserWithoutOTP validates a given token creates a user
// with the given password and deletes the token afterwards.
func (c *Client) CreateUserWithoutOTP(token string, password string) (services.WebSession, error) {
	out, err := c.PostJSON(c.Endpoint("signuptokens", "users"), createUserWithTokenReq{
		Token:    token,
		Password: password,
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetWebSessionMarshaler().UnmarshalWebSession(out.Bytes())
}

// CreateUserWithU2FToken creates user account with provided token and U2F sign response
func (c *Client) CreateUserWithU2FToken(token string, password string, u2fRegisterResponse u2f.RegisterResponse) (services.WebSession, error) {
	out, err := c.PostJSON(c.Endpoint("u2f", "users"), createUserWithU2FTokenReq{
		Token:               token,
		Password:            password,
		U2FRegisterResponse: u2fRegisterResponse,
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetWebSessionMarshaler().UnmarshalWebSession(out.Bytes())
}

// UpsertOIDCConnector updates or creates OIDC connector
func (c *Client) UpsertOIDCConnector(connector services.OIDCConnector) error {
	data, err := services.GetOIDCConnectorMarshaler().MarshalOIDCConnector(connector)
	if err != nil {
		return trace.Wrap(err)
	}
	_, err = c.PostJSON(c.Endpoint("oidc", "connectors"), &upsertOIDCConnectorRawReq{
		Connector: data,
	})
	if err != nil {
		return trace.Wrap(err)
	}
	return nil
}

// GetOIDCConnector returns OIDC connector information by id
func (c *Client) GetOIDCConnector(id string, withSecrets bool) (services.OIDCConnector, error) {
	if id == "" {
		return nil, trace.BadParameter("missing connector id")
	}
	out, err := c.Get(c.Endpoint("oidc", "connectors", id),
		url.Values{"with_secrets": []string{fmt.Sprintf("%t", withSecrets)}})
	if err != nil {
		return nil, err
	}
	return services.GetOIDCConnectorMarshaler().UnmarshalOIDCConnector(out.Bytes())
}

// GetOIDCConnector gets OIDC connectors list
func (c *Client) GetOIDCConnectors(withSecrets bool) ([]services.OIDCConnector, error) {
	out, err := c.Get(c.Endpoint("oidc", "connectors"),
		url.Values{"with_secrets": []string{fmt.Sprintf("%t", withSecrets)}})
	if err != nil {
		return nil, err
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	connectors := make([]services.OIDCConnector, len(items))
	for i, raw := range items {
		connector, err := services.GetOIDCConnectorMarshaler().UnmarshalOIDCConnector(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		connectors[i] = connector
	}
	return connectors, nil
}

// DeleteOIDCConnector deletes OIDC connector by ID
func (c *Client) DeleteOIDCConnector(connectorID string) error {
	if connectorID == "" {
		return trace.BadParameter("missing connector id")
	}
	_, err := c.Delete(c.Endpoint("oidc", "connectors", connectorID))
	return trace.Wrap(err)
}

// CreateOIDCAuthRequest creates OIDCAuthRequest
func (c *Client) CreateOIDCAuthRequest(req services.OIDCAuthRequest) (*services.OIDCAuthRequest, error) {
	out, err := c.PostJSON(c.Endpoint("oidc", "requests", "create"), createOIDCAuthRequestReq{
		Req: req,
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var response *services.OIDCAuthRequest
	if err := json.Unmarshal(out.Bytes(), &response); err != nil {
		return nil, trace.Wrap(err)
	}
	return response, nil
}

// ValidateOIDCAuthCallback validates OIDC auth callback returned from redirect
func (c *Client) ValidateOIDCAuthCallback(q url.Values) (*OIDCAuthResponse, error) {
	out, err := c.PostJSON(c.Endpoint("oidc", "requests", "validate"), validateOIDCAuthCallbackReq{
		Query: q,
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var rawResponse *oidcAuthRawResponse
	if err := json.Unmarshal(out.Bytes(), &rawResponse); err != nil {
		return nil, trace.Wrap(err)
	}
	response := OIDCAuthResponse{
		Username: rawResponse.Username,
		Identity: rawResponse.Identity,
		Cert:     rawResponse.Cert,
		Req:      rawResponse.Req,
		TLSCert:  rawResponse.TLSCert,
	}
	if len(rawResponse.Session) != 0 {
		session, err := services.GetWebSessionMarshaler().UnmarshalWebSession(rawResponse.Session)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		response.Session = session
	}
	response.HostSigners = make([]services.CertAuthority, len(rawResponse.HostSigners))
	for i, raw := range rawResponse.HostSigners {
		ca, err := services.GetCertAuthorityMarshaler().UnmarshalCertAuthority(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		response.HostSigners[i] = ca
	}
	return &response, nil
}

// CreateOIDCConnector creates SAML connector
func (c *Client) CreateSAMLConnector(connector services.SAMLConnector) error {
	data, err := services.GetSAMLConnectorMarshaler().MarshalSAMLConnector(connector)
	if err != nil {
		return trace.Wrap(err)
	}
	_, err = c.PostJSON(c.Endpoint("saml", "connectors"), &createSAMLConnectorRawReq{
		Connector: data,
	})
	if err != nil {
		return trace.Wrap(err)
	}
	return nil
}

// UpsertSAMLConnector updates or creates OIDC connector
func (c *Client) UpsertSAMLConnector(connector services.SAMLConnector) error {
	data, err := services.GetSAMLConnectorMarshaler().MarshalSAMLConnector(connector)
	if err != nil {
		return trace.Wrap(err)
	}
	_, err = c.PutJSON(c.Endpoint("saml", "connectors"), &upsertSAMLConnectorRawReq{
		Connector: data,
	})
	if err != nil {
		return trace.Wrap(err)
	}
	return nil
}

// GetOIDCConnector returns SAML connector information by id
func (c *Client) GetSAMLConnector(id string, withSecrets bool) (services.SAMLConnector, error) {
	if id == "" {
		return nil, trace.BadParameter("missing connector id")
	}
	out, err := c.Get(c.Endpoint("saml", "connectors", id),
		url.Values{"with_secrets": []string{fmt.Sprintf("%t", withSecrets)}})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetSAMLConnectorMarshaler().UnmarshalSAMLConnector(out.Bytes())
}

// GetSAMLConnectors gets SAML connectors list
func (c *Client) GetSAMLConnectors(withSecrets bool) ([]services.SAMLConnector, error) {
	out, err := c.Get(c.Endpoint("saml", "connectors"),
		url.Values{"with_secrets": []string{fmt.Sprintf("%t", withSecrets)}})
	if err != nil {
		return nil, err
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	connectors := make([]services.SAMLConnector, len(items))
	for i, raw := range items {
		connector, err := services.GetSAMLConnectorMarshaler().UnmarshalSAMLConnector(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		connectors[i] = connector
	}
	return connectors, nil
}

// DeleteSAMLConnector deletes SAML connector by ID
func (c *Client) DeleteSAMLConnector(connectorID string) error {
	if connectorID == "" {
		return trace.BadParameter("missing connector id")
	}
	_, err := c.Delete(c.Endpoint("saml", "connectors", connectorID))
	return trace.Wrap(err)
}

// CreateSAMLAuthRequest creates SAML AuthnRequest
func (c *Client) CreateSAMLAuthRequest(req services.SAMLAuthRequest) (*services.SAMLAuthRequest, error) {
	out, err := c.PostJSON(c.Endpoint("saml", "requests", "create"), createSAMLAuthRequestReq{
		Req: req,
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var response *services.SAMLAuthRequest
	if err := json.Unmarshal(out.Bytes(), &response); err != nil {
		return nil, trace.Wrap(err)
	}
	return response, nil
}

// ValidateSAMLResponse validates response returned by SAML identity provider
func (c *Client) ValidateSAMLResponse(re string) (*SAMLAuthResponse, error) {
	out, err := c.PostJSON(c.Endpoint("saml", "requests", "validate"), validateSAMLResponseReq{
		Response: re,
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var rawResponse *samlAuthRawResponse
	if err := json.Unmarshal(out.Bytes(), &rawResponse); err != nil {
		return nil, trace.Wrap(err)
	}
	response := SAMLAuthResponse{
		Username: rawResponse.Username,
		Identity: rawResponse.Identity,
		Cert:     rawResponse.Cert,
		Req:      rawResponse.Req,
		TLSCert:  rawResponse.TLSCert,
	}
	if len(rawResponse.Session) != 0 {
		session, err := services.GetWebSessionMarshaler().UnmarshalWebSession(rawResponse.Session)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		response.Session = session
	}
	response.HostSigners = make([]services.CertAuthority, len(rawResponse.HostSigners))
	for i, raw := range rawResponse.HostSigners {
		ca, err := services.GetCertAuthorityMarshaler().UnmarshalCertAuthority(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		response.HostSigners[i] = ca
	}
	return &response, nil
}

// CreateGithubConnector creates a new Github connector
func (c *Client) CreateGithubConnector(connector services.GithubConnector) error {
	bytes, err := services.GetGithubConnectorMarshaler().Marshal(connector)
	if err != nil {
		return trace.Wrap(err)
	}
	_, err = c.PostJSON(c.Endpoint("github", "connectors"), &createGithubConnectorRawReq{
		Connector: bytes,
	})
	if err != nil {
		return trace.Wrap(err)
	}
	return nil
}

// UpsertGithubConnector creates or updates a Github connector
func (c *Client) UpsertGithubConnector(connector services.GithubConnector) error {
	bytes, err := services.GetGithubConnectorMarshaler().Marshal(connector)
	if err != nil {
		return trace.Wrap(err)
	}
	_, err = c.PutJSON(c.Endpoint("github", "connectors"), &upsertGithubConnectorRawReq{
		Connector: bytes,
	})
	if err != nil {
		return trace.Wrap(err)
	}
	return nil
}

// GetGithubConnectors returns all configured Github connectors
func (c *Client) GetGithubConnectors(withSecrets bool) ([]services.GithubConnector, error) {
	out, err := c.Get(c.Endpoint("github", "connectors"), url.Values{
		"with_secrets": []string{strconv.FormatBool(withSecrets)},
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	connectors := make([]services.GithubConnector, len(items))
	for i, raw := range items {
		connector, err := services.GetGithubConnectorMarshaler().Unmarshal(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		connectors[i] = connector
	}
	return connectors, nil
}

// GetGithubConnector returns the specified Github connector
func (c *Client) GetGithubConnector(id string, withSecrets bool) (services.GithubConnector, error) {
	out, err := c.Get(c.Endpoint("github", "connectors", id), url.Values{
		"with_secrets": []string{strconv.FormatBool(withSecrets)},
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetGithubConnectorMarshaler().Unmarshal(out.Bytes())
}

// DeleteGithubConnector deletes the specified Github connector
func (c *Client) DeleteGithubConnector(id string) error {
	_, err := c.Delete(c.Endpoint("github", "connectors", id))
	if err != nil {
		return trace.Wrap(err)
	}
	return nil
}

// CreateGithubAuthRequest creates a new request for Github OAuth2 flow
func (c *Client) CreateGithubAuthRequest(req services.GithubAuthRequest) (*services.GithubAuthRequest, error) {
	out, err := c.PostJSON(c.Endpoint("github", "requests", "create"),
		createGithubAuthRequestReq{Req: req})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var response services.GithubAuthRequest
	if err := json.Unmarshal(out.Bytes(), &response); err != nil {
		return nil, trace.Wrap(err)
	}
	return &response, nil
}

// ValidateGithubAuthCallback validates Github auth callback returned from redirect
func (c *Client) ValidateGithubAuthCallback(q url.Values) (*GithubAuthResponse, error) {
	out, err := c.PostJSON(c.Endpoint("github", "requests", "validate"),
		validateGithubAuthCallbackReq{Query: q})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var rawResponse githubAuthRawResponse
	if err := json.Unmarshal(out.Bytes(), &rawResponse); err != nil {
		return nil, trace.Wrap(err)
	}
	response := GithubAuthResponse{
		Username: rawResponse.Username,
		Identity: rawResponse.Identity,
		Cert:     rawResponse.Cert,
		Req:      rawResponse.Req,
		TLSCert:  rawResponse.TLSCert,
	}
	if len(rawResponse.Session) != 0 {
		session, err := services.GetWebSessionMarshaler().UnmarshalWebSession(
			rawResponse.Session)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		response.Session = session
	}
	response.HostSigners = make([]services.CertAuthority, len(rawResponse.HostSigners))
	for i, raw := range rawResponse.HostSigners {
		ca, err := services.GetCertAuthorityMarshaler().UnmarshalCertAuthority(raw)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		response.HostSigners[i] = ca
	}
	return &response, nil
}

// EmitAuditEvent sends an auditable event to the auth server (part of evets.IAuditLog interface)
func (c *Client) EmitAuditEvent(event events.Event, fields events.EventFields) error {
	_, err := c.PostJSON(c.Endpoint("events"), &auditEventReq{
		Event:  event,
		Fields: fields,
		// Send "type" as well for backwards compatibility.
		Type: event.Name,
	})
	if err != nil {
		return trace.Wrap(err)
	}
	return nil
}

// PostSessionSlice allows clients to submit session stream chunks to the audit log
// (part of evets.IAuditLog interface)
//
// The data is POSTed to HTTP server as a simple binary body (no encodings of any
// kind are needed)
func (c *Client) PostSessionSlice(slice events.SessionSlice) error {
	data, err := slice.Marshal()
	if err != nil {
		return trace.Wrap(err)
	}
	r, err := http.NewRequest("POST", c.Endpoint("namespaces", slice.Namespace, "sessions", string(slice.SessionID), "slice"), bytes.NewReader(data))
	if err != nil {
		return trace.Wrap(err)
	}
	r.Header.Set("Content-Type", "application/grpc")
	c.Client.SetAuthHeader(r.Header)
	re, err := c.Client.HTTPClient().Do(r)
	if err != nil {
		return trace.Wrap(err)
	}
	// we **must** consume response by reading all of its body, otherwise the http
	// client will allocate a new connection for subsequent requests
	defer re.Body.Close()
	responseBytes, _ := ioutil.ReadAll(re.Body)
	return trace.ReadError(re.StatusCode, responseBytes)
}

// GetSessionChunk allows clients to receive a byte array (chunk) from a recorded
// session stream, starting from 'offset', up to 'max' in length. The upper bound
// of 'max' is set to events.MaxChunkBytes
func (c *Client) GetSessionChunk(namespace string, sid session.ID, offsetBytes, maxBytes int) ([]byte, error) {
	if namespace == "" {
		return nil, trace.BadParameter(MissingNamespaceError)
	}
	response, err := c.Get(c.Endpoint("namespaces", namespace, "sessions", string(sid), "stream"), url.Values{
		"offset": []string{strconv.Itoa(offsetBytes)},
		"bytes":  []string{strconv.Itoa(maxBytes)},
	})
	if err != nil {
		log.Error(err)
		return nil, trace.Wrap(err)
	}
	return response.Bytes(), nil
}

// UploadSessionRecording uploads session recording to the audit server
func (c *Client) UploadSessionRecording(r events.SessionRecording) error {
	file := roundtrip.File{
		Name:     "recording",
		Filename: "recording",
		Reader:   r.Recording,
	}
	values := url.Values{
		"sid":       []string{string(r.SessionID)},
		"namespace": []string{r.Namespace},
	}
	_, err := c.PostForm(c.Endpoint("namespaces", r.Namespace, "sessions", string(r.SessionID), "recording"), values, file)
	if err != nil {
		return trace.Wrap(err)
	}
	return nil
}

// Returns events that happen during a session sorted by time
// (oldest first).
//
// afterN allows to filter by "newer than N" value where N is the cursor ID
// of previously returned bunch (good for polling for latest)
//
// This function is usually used in conjunction with GetSessionReader to
// replay recorded session streams.
func (c *Client) GetSessionEvents(namespace string, sid session.ID, afterN int, includePrintEvents bool) (retval []events.EventFields, err error) {
	if namespace == "" {
		return nil, trace.BadParameter(MissingNamespaceError)
	}
	query := make(url.Values)
	if afterN > 0 {
		query.Set("after", strconv.Itoa(afterN))
	}
	if includePrintEvents {
		query.Set("print", fmt.Sprintf("%v", includePrintEvents))
	}
	response, err := c.Get(c.Endpoint("namespaces", namespace, "sessions", string(sid), "events"), query)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	retval = make([]events.EventFields, 0)
	if err := json.Unmarshal(response.Bytes(), &retval); err != nil {
		return nil, trace.Wrap(err)
	}
	return retval, nil
}

// SearchEvents returns events that fit the criteria
func (c *Client) SearchEvents(from, to time.Time, query string, limit int) ([]events.EventFields, error) {
	q, err := url.ParseQuery(query)
	if err != nil {
		return nil, trace.BadParameter("query")
	}
	q.Set("from", from.Format(time.RFC3339))
	q.Set("to", to.Format(time.RFC3339))
	q.Set("limit", fmt.Sprintf("%v", limit))
	response, err := c.Get(c.Endpoint("events"), q)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	retval := make([]events.EventFields, 0)
	if err := json.Unmarshal(response.Bytes(), &retval); err != nil {
		return nil, trace.Wrap(err)
	}
	return retval, nil
}

// SearchSessionEvents returns session related events to find completed sessions.
func (c *Client) SearchSessionEvents(from, to time.Time, limit int) ([]events.EventFields, error) {
	query := url.Values{
		"to":    []string{to.Format(time.RFC3339)},
		"from":  []string{from.Format(time.RFC3339)},
		"limit": []string{fmt.Sprintf("%v", limit)},
	}

	response, err := c.Get(c.Endpoint("events", "session"), query)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	retval := make([]events.EventFields, 0)
	if err := json.Unmarshal(response.Bytes(), &retval); err != nil {
		return nil, trace.Wrap(err)
	}

	return retval, nil
}

// GetNamespaces returns a list of namespaces
func (c *Client) GetNamespaces() ([]services.Namespace, error) {
	out, err := c.Get(c.Endpoint("namespaces"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var re []services.Namespace
	if err := json.Unmarshal(out.Bytes(), &re); err != nil {
		return nil, trace.Wrap(err)
	}
	return re, nil
}

// GetNamespace returns namespace by name
func (c *Client) GetNamespace(name string) (*services.Namespace, error) {
	if name == "" {
		return nil, trace.BadParameter("missing namespace name")
	}
	out, err := c.Get(c.Endpoint("namespaces", name), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var ns services.Namespace
	if err := json.Unmarshal(out.Bytes(), &ns); err != nil {
		return nil, trace.Wrap(err)
	}
	return &ns, nil
}

// UpsertNamespace upserts namespace
func (c *Client) UpsertNamespace(ns services.Namespace) error {
	_, err := c.PostJSON(c.Endpoint("namespaces"), upsertNamespaceReq{Namespace: ns})
	return trace.Wrap(err)
}

// DeleteNamespace deletes namespace by name
func (c *Client) DeleteNamespace(name string) error {
	_, err := c.Delete(c.Endpoint("namespaces", name))
	return trace.Wrap(err)
}

// GetRoles returns a list of roles
func (c *Client) GetRoles() ([]services.Role, error) {
	out, err := c.Get(c.Endpoint("roles"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	roles := make([]services.Role, len(items))
	for i, roleBytes := range items {
		role, err := services.GetRoleMarshaler().UnmarshalRole(roleBytes)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		roles[i] = role
	}
	return roles, nil
}

// CreateRole creates a role.
func (c *Client) CreateRole(role services.Role, ttl time.Duration) error {
	return trace.BadParameter("not implemented")
}

// UpsertRole creates or updates role
func (c *Client) UpsertRole(role services.Role, ttl time.Duration) error {
	data, err := services.GetRoleMarshaler().MarshalRole(role)
	if err != nil {
		return trace.Wrap(err)
	}
	_, err = c.PostJSON(c.Endpoint("roles"), &upsertRoleRawReq{Role: data})
	return trace.Wrap(err)
}

// GetRole returns role by name
func (c *Client) GetRole(name string) (services.Role, error) {
	if name == "" {
		return nil, trace.BadParameter("missing name")
	}
	out, err := c.Get(c.Endpoint("roles", name), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	role, err := services.GetRoleMarshaler().UnmarshalRole(out.Bytes())
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return role, nil
}

// DeleteRole deletes role by name
func (c *Client) DeleteRole(name string) error {
	_, err := c.Delete(c.Endpoint("roles", name))
	return trace.Wrap(err)
}

// GetClusterConfig returns cluster level configuration information.
func (c *Client) GetClusterConfig() (services.ClusterConfig, error) {
	out, err := c.Get(c.Endpoint("configuration"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}

	cc, err := services.GetClusterConfigMarshaler().Unmarshal(out.Bytes())
	if err != nil {
		return nil, trace.Wrap(err)
	}

	return cc, err
}

// SetClusterConfig sets cluster level configuration information.
func (c *Client) SetClusterConfig(cc services.ClusterConfig) error {
	data, err := services.GetClusterConfigMarshaler().Marshal(cc)
	if err != nil {
		return trace.Wrap(err)
	}

	_, err = c.PostJSON(c.Endpoint("configuration"), &setClusterConfigReq{ClusterConfig: data})
	if err != nil {
		return trace.Wrap(err)
	}

	return nil
}

func (c *Client) GetClusterName() (services.ClusterName, error) {
	out, err := c.Get(c.Endpoint("configuration", "name"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}

	cn, err := services.GetClusterNameMarshaler().Unmarshal(out.Bytes())
	if err != nil {
		return nil, trace.Wrap(err)
	}

	return cn, err
}

func (c *Client) SetClusterName(cn services.ClusterName) error {
	data, err := services.GetClusterNameMarshaler().Marshal(cn)
	if err != nil {
		return trace.Wrap(err)
	}

	_, err = c.PostJSON(c.Endpoint("configuration", "name"), &setClusterNameReq{ClusterName: data})
	if err != nil {
		return trace.Wrap(err)
	}

	return nil
}

func (c *Client) GetStaticTokens() (services.StaticTokens, error) {
	out, err := c.Get(c.Endpoint("configuration", "static_tokens"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}

	st, err := services.GetStaticTokensMarshaler().Unmarshal(out.Bytes())
	if err != nil {
		return nil, trace.Wrap(err)
	}

	return st, err
}

func (c *Client) SetStaticTokens(st services.StaticTokens) error {
	data, err := services.GetStaticTokensMarshaler().Marshal(st)
	if err != nil {
		return trace.Wrap(err)
	}

	_, err = c.PostJSON(c.Endpoint("configuration", "static_tokens"), &setStaticTokensReq{StaticTokens: data})
	if err != nil {
		return trace.Wrap(err)
	}

	return nil
}

func (c *Client) GetAuthPreference() (services.AuthPreference, error) {
	out, err := c.Get(c.Endpoint("authentication", "preference"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}

	cap, err := services.GetAuthPreferenceMarshaler().Unmarshal(out.Bytes())
	if err != nil {
		return nil, trace.Wrap(err)
	}

	return cap, nil
}

func (c *Client) SetAuthPreference(cap services.AuthPreference) error {
	data, err := services.GetAuthPreferenceMarshaler().Marshal(cap)
	if err != nil {
		return trace.Wrap(err)
	}

	_, err = c.PostJSON(c.Endpoint("authentication", "preference"), &setClusterAuthPreferenceReq{ClusterAuthPreference: data})
	if err != nil {
		return trace.Wrap(err)
	}

	return nil
}

// GetLocalClusterName returns local cluster name
func (c *Client) GetLocalClusterName() (string, error) {
	return c.GetDomainName()
}

// UpsertLocalClusterName upserts local cluster name
func (c *Client) UpsertLocalClusterName(string) error {
	return trace.BadParameter("not implemented")
}

// DeleteAllCertAuthorities deletes all certificate authorities of a certain type
func (c *Client) DeleteAllCertAuthorities(caType services.CertAuthType) error {
	return trace.BadParameter("not implemented")
}

// DeleteAllReverseTunnels deletes all reverse tunnels
func (c *Client) DeleteAllReverseTunnels() error {
	return trace.BadParameter("not implemented")
}

// DeleteAllCertNamespaces deletes all namespaces
func (c *Client) DeleteAllNamespaces() error {
	return trace.BadParameter("not implemented")
}

// DeleteAllProxies deletes all proxies
func (c *Client) DeleteAllProxies() error {
	return trace.BadParameter("not implemented")
}

// DeleteAllNodes deletes all nodes in a given namespace
func (c *Client) DeleteAllNodes(namespace string) error {
	return trace.BadParameter("not implemented")
}

// DeleteAllRoles deletes all roles
func (c *Client) DeleteAllRoles() error {
	return trace.BadParameter("not implemented")
}

// DeleteAllUsers deletes all users
func (c *Client) DeleteAllUsers() error {
	return trace.BadParameter("not implemented")
}

func (c *Client) GetTrustedCluster(name string) (services.TrustedCluster, error) {
	out, err := c.Get(c.Endpoint("trustedclusters", name), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}

	trustedCluster, err := services.GetTrustedClusterMarshaler().Unmarshal(out.Bytes())
	if err != nil {
		return nil, trace.Wrap(err)
	}

	return trustedCluster, nil
}

func (c *Client) GetTrustedClusters() ([]services.TrustedCluster, error) {
	out, err := c.Get(c.Endpoint("trustedclusters"), url.Values{})
	if err != nil {
		return nil, trace.Wrap(err)
	}

	var items []json.RawMessage
	if err := json.Unmarshal(out.Bytes(), &items); err != nil {
		return nil, trace.Wrap(err)
	}
	trustedClusters := make([]services.TrustedCluster, len(items))
	for i, bytes := range items {
		trustedCluster, err := services.GetTrustedClusterMarshaler().Unmarshal(bytes)
		if err != nil {
			return nil, trace.Wrap(err)
		}
		trustedClusters[i] = trustedCluster
	}

	return trustedClusters, nil
}

func (c *Client) UpsertTrustedCluster(trustedCluster services.TrustedCluster) (services.TrustedCluster, error) {
	trustedClusterBytes, err := services.GetTrustedClusterMarshaler().Marshal(trustedCluster)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	out, err := c.PostJSON(c.Endpoint("trustedclusters"), &upsertTrustedClusterReq{
		TrustedCluster: trustedClusterBytes,
	})
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return services.GetTrustedClusterMarshaler().Unmarshal(out.Bytes())
}

func (c *Client) ValidateTrustedCluster(validateRequest *ValidateTrustedClusterRequest) (*ValidateTrustedClusterResponse, error) {
	validateRequestRaw, err := validateRequest.ToRaw()
	if err != nil {
		return nil, trace.Wrap(err)
	}

	out, err := c.PostJSON(c.Endpoint("trustedclusters", "validate"), validateRequestRaw)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	var validateResponseRaw ValidateTrustedClusterResponseRaw
	err = json.Unmarshal(out.Bytes(), &validateResponseRaw)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	validateResponse, err := validateResponseRaw.ToNative()
	if err != nil {
		return nil, trace.Wrap(err)
	}

	return validateResponse, nil
}

func (c *Client) DeleteTrustedCluster(name string) error {
	_, err := c.Delete(c.Endpoint("trustedclusters", name))
	return trace.Wrap(err)
}

// WebService implements features used by Web UI clients
type WebService interface {
	// GetWebSessionInfo checks if a web sesion is valid, returns session id in case if
	// it is valid, or error otherwise.
	GetWebSessionInfo(user string, sid string) (services.WebSession, error)
	// ExtendWebSession creates a new web session for a user based on another
	// valid web session
	ExtendWebSession(user string, prevSessionID string) (services.WebSession, error)
	// CreateWebSession creates a new web session for a user
	CreateWebSession(user string) (services.WebSession, error)
	// DeleteWebSession deletes a web session for this user by id
	DeleteWebSession(user string, sid string) error
}

// IdentityService manages identities and users
type IdentityService interface {
	// UpsertPassword updates web access password for the user
	UpsertPassword(user string, password []byte) error

	// UpsertOIDCConnector updates or creates OIDC connector
	UpsertOIDCConnector(connector services.OIDCConnector) error

	// GetOIDCConnector returns OIDC connector information by id
	GetOIDCConnector(id string, withSecrets bool) (services.OIDCConnector, error)

	// GetOIDCConnector gets OIDC connectors list
	GetOIDCConnectors(withSecrets bool) ([]services.OIDCConnector, error)

	// DeleteOIDCConnector deletes OIDC connector by ID
	DeleteOIDCConnector(connectorID string) error

	// CreateOIDCAuthRequest creates OIDCAuthRequest
	CreateOIDCAuthRequest(req services.OIDCAuthRequest) (*services.OIDCAuthRequest, error)

	// ValidateOIDCAuthCallback validates OIDC auth callback returned from redirect
	ValidateOIDCAuthCallback(q url.Values) (*OIDCAuthResponse, error)

	// CreateSAMLConnector creates SAML connector
	CreateSAMLConnector(connector services.SAMLConnector) error

	// UpsertSAMLConnector updates or creates SAML connector
	UpsertSAMLConnector(connector services.SAMLConnector) error

	// GetSAMLConnector returns SAML connector information by id
	GetSAMLConnector(id string, withSecrets bool) (services.SAMLConnector, error)

	// GetSAMLConnector gets SAML connectors list
	GetSAMLConnectors(withSecrets bool) ([]services.SAMLConnector, error)

	// DeleteSAMLConnector deletes SAML connector by ID
	DeleteSAMLConnector(connectorID string) error

	// CreateSAMLAuthRequest creates SAML AuthnRequest
	CreateSAMLAuthRequest(req services.SAMLAuthRequest) (*services.SAMLAuthRequest, error)

	// ValidateSAMLResponse validates SAML auth response
	ValidateSAMLResponse(re string) (*SAMLAuthResponse, error)

	// CreateGithubConnector creates a new Github connector
	CreateGithubConnector(connector services.GithubConnector) error
	// UpsertGithubConnector creates or updates a Github connector
	UpsertGithubConnector(connector services.GithubConnector) error
	// GetGithubConnectors returns all configured Github connectors
	GetGithubConnectors(withSecrets bool) ([]services.GithubConnector, error)
	// GetGithubConnector returns the specified Github connector
	GetGithubConnector(id string, withSecrets bool) (services.GithubConnector, error)
	// DeleteGithubConnector deletes the specified Github connector
	DeleteGithubConnector(id string) error
	// CreateGithubAuthRequest creates a new request for Github OAuth2 flow
	CreateGithubAuthRequest(services.GithubAuthRequest) (*services.GithubAuthRequest, error)
	// ValidateGithubAuthCallback validates Github auth callback
	ValidateGithubAuthCallback(q url.Values) (*GithubAuthResponse, error)

	// GetU2FSignRequest generates request for user trying to authenticate with U2F token
	GetU2FSignRequest(user string, password []byte) (*u2f.SignRequest, error)

	// GetSignupU2FRegisterRequest generates sign request for user trying to sign up with invite token
	GetSignupU2FRegisterRequest(token string) (*u2f.RegisterRequest, error)

	// CreateUserWithU2FToken creates user account with provided token and U2F sign response
	CreateUserWithU2FToken(token string, password string, u2fRegisterResponse u2f.RegisterResponse) (services.WebSession, error)

	// GetUser returns user by name
	GetUser(name string) (services.User, error)

	// UpsertUser user updates or inserts user entry
	UpsertUser(user services.User) error

	// DeleteUser deletes a user by username
	DeleteUser(user string) error

	// GetUsers returns a list of usernames registered in the system
	GetUsers() ([]services.User, error)

	// ChangePassword changes user password
	ChangePassword(req services.ChangePasswordReq) error

	// CheckPassword checks if the suplied web access password is valid.
	CheckPassword(user string, password []byte, otpToken string) error

	// CreateUserWithOTP creates account with provided token and password.
	// Account username and OTP key are taken from token data.
	// Deletes token after account creation.
	CreateUserWithOTP(token, password, otpToken string) (services.WebSession, error)

	// CreateUserWithoutOTP validates a given token creates a user
	// with the given password and deletes the token afterwards.
	CreateUserWithoutOTP(token string, password string) (services.WebSession, error)

	// GenerateToken creates a special provisioning token for a new SSH server
	// that is valid for ttl period seconds.
	//
	// This token is used by SSH server to authenticate with Auth server
	// and get signed certificate and private key from the auth server.
	//
	// If token is not supplied, it will be auto generated and returned.
	// If TTL is not supplied, token will be valid until removed.
	GenerateToken(GenerateTokenRequest) (string, error)

	// GenerateKeyPair generates SSH private/public key pair optionally protected
	// by password. If the pass parameter is an empty string, the key pair
	// is not password-protected.
	GenerateKeyPair(pass string) ([]byte, []byte, error)

	// GenerateHostCert takes the public key in the Open SSH ``authorized_keys``
	// plain text format, signs it using Host Certificate Authority private key and returns the
	// resulting certificate.
	GenerateHostCert(key []byte, hostID, nodeName string, principals []string, clusterName string, roles teleport.Roles, ttl time.Duration) ([]byte, error)

	// GenerateUserCert takes the public key in the OpenSSH `authorized_keys`
	// plain text format, signs it using User Certificate Authority signing key and returns the
	// resulting certificate.
	GenerateUserCert(key []byte, user string, ttl time.Duration, compatibility string) ([]byte, error)

	// GetSignupTokenData returns token data for a valid token
	GetSignupTokenData(token string) (user string, otpQRCode []byte, e error)

	// CreateSignupToken creates one time token for creating account for the user
	// For each token it creates username and OTP key
	CreateSignupToken(user services.UserV1, ttl time.Duration) (string, error)
}

// ProvisioningService is a service in control
// of adding new nodes, auth servers and proxies to the cluster
type ProvisioningService interface {
	// GetTokens returns a list of active invitation tokens for nodes and users
	GetTokens() (tokens []services.ProvisionToken, err error)

	// GetToken returns provisioning token
	GetToken(token string) (*services.ProvisionToken, error)

	// DeleteToken deletes a given provisioning token on the auth server (CA). It
	// could be a user token or a machine token
	DeleteToken(token string) error

	// RegisterUsingToken calls the auth service API to register a new node via registration token
	// which has been previously issued via GenerateToken
	RegisterUsingToken(req RegisterUsingTokenRequest) (*PackedKeys, error)

	// RegisterNewAuthServer is used to register new auth server with token
	RegisterNewAuthServer(token string) error
}

// ClientI is a client to Auth service
type ClientI interface {
	IdentityService
	ProvisioningService
	services.Trust
	events.IAuditLog
	services.Presence
	services.Access
	WebService
	session.Service
	services.ClusterConfiguration

	// RotateCertAuthority starts or restarts certificate authority rotation process.
	RotateCertAuthority(req RotateRequest) error

	// RotateExternalCertAuthority rotates external certificate authority,
	// this method is used to update only public keys and certificates of the
	// the certificate authorities of trusted clusters.
	RotateExternalCertAuthority(ca services.CertAuthority) error

	// ValidateTrustedCluster validates trusted cluster token with
	// main cluster, in case if validation is successful, main cluster
	// adds remote cluster
	ValidateTrustedCluster(*ValidateTrustedClusterRequest) (*ValidateTrustedClusterResponse, error)

	// GetDomainName returns auth server cluster name
	GetDomainName() (string, error)

	// GetClusterCACert returns the CAs for the local cluster without signing keys.
	GetClusterCACert() (*LocalCAResponse, error)

	// GenerateServerKeys generates new host private keys and certificates (signed
	// by the host certificate authority) for a node
	GenerateServerKeys(GenerateServerKeysRequest) (*PackedKeys, error)
	// AuthenticateWebUser authenticates web user, creates and  returns web session
	// in case if authentication is successful
	AuthenticateWebUser(req AuthenticateUserRequest) (services.WebSession, error)
	// AuthenticateSSHUser authenticates SSH console user, creates and  returns a pair of signed TLS and SSH
	// short lived certificates as a result
	AuthenticateSSHUser(req AuthenticateSSHRequest) (*SSHLoginResponse, error)

	// ProcessKubeCSR processes CSR request against Kubernetes CA, returns
	// signed certificate if sucessful.
	ProcessKubeCSR(req KubeCSR) (*KubeCSRResponse, error)
}
