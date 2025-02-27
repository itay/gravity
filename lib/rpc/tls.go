/*
Copyright 2018 Gravitational, Inc.

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

package rpc

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gravitational/gravity/lib/defaults"
	"github.com/gravitational/gravity/lib/loc"
	"github.com/gravitational/gravity/lib/pack"
	pb "github.com/gravitational/gravity/lib/rpc/proto"
	"github.com/gravitational/gravity/lib/utils"

	"github.com/cloudflare/cfssl/csr"
	"github.com/gravitational/license/authority"
	"github.com/gravitational/trace"
	"google.golang.org/grpc/credentials"
)

// InitRPCCredentials creates a package with RPC secrets in the specified package service
func InitRPCCredentials(packages pack.PackageService) (*loc.Locator, error) {
	longLivedClient := true
	keys, err := GenerateAgentCredentials(nil, defaults.SystemAccountOrg, longLivedClient)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	err = createPackage(packages, loc.RPCSecrets, keys)
	if err != nil {
		return &loc.RPCSecrets, trace.Wrap(err)
	}

	return &loc.RPCSecrets, nil
}

// GenerateAgentCredentialsPackage creates or updates a package in packages with client/server credentials.
// pkgTemplate specifies the naming template for the resulting package
func GenerateAgentCredentialsPackage(packages pack.PackageService, pkgTemplate loc.Locator,
	archive utils.TLSArchive) (secretsLocator *loc.Locator, err error) {
	secretsLocator, err = loc.NewLocator(
		pkgTemplate.Repository,
		defaults.RPCAgentSecretsPackage,
		pkgTemplate.Version)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	err = upsertPackage(packages, *secretsLocator, archive)
	if err != nil {
		return secretsLocator, trace.Wrap(err)
	}

	return secretsLocator, nil
}

// GenerateAgentCredentials creates client/server credentials archive.
// hosts lists additional hosts to add to the generated certificates.
func GenerateAgentCredentials(hosts []string, commonName string, longLivedClient bool) (archive utils.TLSArchive, err error) {
	ca, err := authority.GenerateSelfSignedCA(csr.CertificateRequest{
		CN: commonName,
	})

	if err != nil {
		return nil, trace.Wrap(err)
	}

	serverKeyPair, err := authority.GenerateCertificate(csr.CertificateRequest{
		CN: pb.ServerName,
		// Go 1.9 https://github.com/golang/go/commit/630e93ed2d8a13226903451a0e85e62efd78cdcd
		Hosts: append(hosts, pb.ServerName),
		Names: []csr.Name{
			{
				O:  "Gravitational",
				OU: "Local Cluster",
			},
		},
	}, ca, nil, defaults.CertificateExpiry)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	var clientTTL time.Duration
	if longLivedClient {
		clientTTL = defaults.CertificateExpiry
	}
	clientKeyPair, err := authority.GenerateCertificate(csr.CertificateRequest{
		CN: "leadagent",
		Names: []csr.Name{
			{
				O:  "Gravitational",
				OU: "Local Cluster",
			},
		},
	}, ca, nil, clientTTL)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	caCert := *ca
	caCert.KeyPEM = nil

	archive = utils.TLSArchive{
		pb.Server: serverKeyPair,
		pb.Client: clientKeyPair,
		pb.CA:     &caCert,
	}

	return archive, nil
}

// Credentials returns both server and client credentials read from the
// specified directory
func Credentials(secretsDir string) (server credentials.TransportCredentials, client credentials.TransportCredentials, err error) {
	server, err = ServerCredentials(secretsDir)
	if err != nil {
		return nil, nil, trace.Wrap(err)
	}
	client, err = ClientCredentials(secretsDir)
	if err != nil {
		return nil, nil, trace.Wrap(err)
	}
	return server, client, nil
}

// CredentialsFromPackage loads both server and client credentials from the specified package
func CredentialsFromPackage(
	packages pack.PackageService,
	secretsPackage loc.Locator,
) (server credentials.TransportCredentials, client credentials.TransportCredentials, err error) {
	_, reader, err := packages.ReadPackage(secretsPackage)
	if err != nil {
		return nil, nil, trace.Wrap(err)
	}
	defer reader.Close()
	tlsArchive, err := utils.ReadTLSArchive(reader)
	if err != nil {
		return nil, nil, trace.Wrap(err)
	}
	server, err = ServerCredentialsFromKeyPairs(*tlsArchive[pb.Server], *tlsArchive[pb.CA])
	if err != nil {
		return nil, nil, trace.Wrap(err)
	}
	client, err = ClientCredentialsFromKeyPairs(*tlsArchive[pb.Client], *tlsArchive[pb.CA])
	if err != nil {
		return nil, nil, trace.Wrap(err)
	}
	return server, client, nil
}

// ClientCredentials loads the client agent credentials from the specified location
func ClientCredentials(secretsDir string) (credentials.TransportCredentials, error) {
	clientCertPath := filepath.Join(secretsDir, fmt.Sprintf("%s.%s", pb.Client, pb.Cert))
	clientKeyPath := filepath.Join(secretsDir, fmt.Sprintf("%s.%s", pb.Client, pb.Key))
	caPath := filepath.Join(secretsDir, fmt.Sprintf("%s.%s", pb.CA, pb.Cert))

	clientCert, err := tls.LoadX509KeyPair(clientCertPath, clientKeyPath)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	certPool := x509.NewCertPool()
	ca, err := ioutil.ReadFile(caPath)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	if ok := certPool.AppendCertsFromPEM(ca); !ok {
		return nil, trace.BadParameter("failed to add CA to pool")
	}

	creds := credentials.NewTLS(&tls.Config{
		ServerName:   pb.ServerName,
		Certificates: []tls.Certificate{clientCert},
		RootCAs:      certPool,
	})
	return creds, nil
}

// ClientCredentialsFromPackage reads client credentials from the specified package
func ClientCredentialsFromPackage(packages pack.PackageService, secretsPackage loc.Locator) (credentials.TransportCredentials, error) {
	_, reader, err := packages.ReadPackage(secretsPackage)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	defer reader.Close()
	tlsArchive, err := utils.ReadTLSArchive(reader)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return ClientCredentialsFromKeyPairs(*tlsArchive[pb.Client],
		*tlsArchive[pb.CA])
}

// ClientCredentialsFromKeyPairs loads agent client credentials from the specified
// set of key pairs
func ClientCredentialsFromKeyPairs(keys, caKeys authority.TLSKeyPair) (credentials.TransportCredentials, error) {
	cert, err := tls.X509KeyPair(keys.CertPEM, keys.KeyPEM)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	certPool := x509.NewCertPool()
	if ok := certPool.AppendCertsFromPEM(caKeys.CertPEM); !ok {
		return nil, trace.BadParameter("failed to add CA to pool")
	}

	creds := credentials.NewTLS(&tls.Config{
		ServerName:   pb.ServerName,
		Certificates: []tls.Certificate{cert},
		RootCAs:      certPool,
	})
	return creds, nil
}

// ServerCredentials loads server agent credentials from the specified location
func ServerCredentials(secretsDir string) (credentials.TransportCredentials, error) {
	serverCertPath := filepath.Join(secretsDir, fmt.Sprintf("%s.%s", pb.Server, pb.Cert))
	serverKeyPath := filepath.Join(secretsDir, fmt.Sprintf("%s.%s", pb.Server, pb.Key))
	caPath := filepath.Join(secretsDir, fmt.Sprintf("%s.%s", pb.CA, pb.Cert))

	serverCert, err := tls.LoadX509KeyPair(serverCertPath, serverKeyPath)
	if err != nil {
		return nil, trace.Wrap(err)
	}

	certPool := x509.NewCertPool()
	ca, err := ioutil.ReadFile(caPath)
	if err != nil {
		return nil, trace.ConvertSystemError(err)
	}

	if ok := certPool.AppendCertsFromPEM(ca); !ok {
		return nil, trace.BadParameter("failed to append CA to cert pool")
	}

	// Create the TLS credentials
	creds := credentials.NewTLS(&tls.Config{
		ClientAuth:   tls.RequireAndVerifyClientCert,
		Certificates: []tls.Certificate{serverCert},
		ClientCAs:    certPool,
	})

	return creds, nil
}

// ServerCredentialsFromPackage reads server credentials from the specified package
func ServerCredentialsFromPackage(packages pack.PackageService, secretsPackage loc.Locator) (credentials.TransportCredentials, error) {
	_, reader, err := packages.ReadPackage(secretsPackage)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	defer reader.Close()
	tlsArchive, err := utils.ReadTLSArchive(reader)
	if err != nil {
		return nil, trace.Wrap(err)
	}
	return ServerCredentialsFromKeyPairs(*tlsArchive[pb.Server],
		*tlsArchive[pb.CA])
}

// ServerCredentialsFromKeyPairs loads server agent credentials from the specified
// set of key pairs
func ServerCredentialsFromKeyPairs(keys, caKeys authority.TLSKeyPair) (credentials.TransportCredentials, error) {
	cert, err := tls.X509KeyPair(keys.CertPEM, keys.KeyPEM)
	if err != nil {
		return nil, err
	}

	certPool := x509.NewCertPool()
	if ok := certPool.AppendCertsFromPEM(caKeys.CertPEM); !ok {
		return nil, trace.BadParameter("failed to append CA to cert pool")
	}

	// Create the TLS credentials
	creds := credentials.NewTLS(&tls.Config{
		ClientAuth:   tls.RequireAndVerifyClientCert,
		Certificates: []tls.Certificate{cert},
		ClientCAs:    certPool,
	})
	return creds, nil
}

// AgentAddr returns a complete agent address for specified address addr.
// If addr already contains a port, the address is returned unaltered,
// otherwise, a default RPC agent port is added
func AgentAddr(addr string) string {
	host, port := utils.SplitHostPort(addr, strconv.Itoa(defaults.GravityRPCAgentPort))
	return fmt.Sprintf("%v:%v", host, port)
}

// createPackage creates the secrets package pkg from archive in packages.
func createPackage(packages pack.PackageService, pkg loc.Locator, archive utils.TLSArchive) error {
	reader, err := utils.CreateTLSArchive(archive)
	if err != nil {
		return trace.Wrap(err)
	}
	defer reader.Close()

	err = packages.UpsertRepository(pkg.Repository, time.Time{})
	if err != nil {
		return trace.Wrap(err)
	}

	labels := map[string]string{
		pack.PurposeLabel: pack.PurposeRPCCredentials,
	}
	_, err = packages.CreatePackage(pkg, reader, pack.WithLabels(labels))
	return trace.Wrap(err)
}

// upsertPackage creates or updates the secrets package pkg from archive in packages.
func upsertPackage(packages pack.PackageService, pkg loc.Locator, archive utils.TLSArchive) error {
	reader, err := utils.CreateTLSArchive(archive)
	if err != nil {
		return trace.Wrap(err)
	}
	defer reader.Close()

	err = packages.UpsertRepository(pkg.Repository, time.Time{})
	if err != nil {
		return trace.Wrap(err)
	}

	labels := map[string]string{
		pack.PurposeLabel: pack.PurposeRPCCredentials,
	}
	_, err = packages.UpsertPackage(pkg, reader, pack.WithLabels(labels))
	return trace.Wrap(err)
}
