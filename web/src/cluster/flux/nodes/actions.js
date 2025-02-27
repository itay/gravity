/*
Copyright 2019 Gravitational, Inc.

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

import $ from 'jQuery';
import reactor from 'app/reactor';
import * as nodeService from 'app/cluster/services/nodes';
import cfg from 'app/config';
import k8s from 'app/cluster/services/k8s';
import { getAcl } from 'app/flux/userAcl';
import { SITE_SERVERS_RECEIVE } from './actionTypes';
import opsService from 'app/services/operations';

export function startShrinkOperation(hostname){
  return opsService.shrink(cfg.defaultSiteId, hostname);
}

export function fetchNodes() {
  const promises = [nodeService.fetchNodes()];
  const acl = getAcl();

  // fetsh k8s nodes only if allowed
  if (acl.clusters.connect) {
    promises.push(k8s.getNodes());
  }

  return $.when(...promises)
    .then((...responses) => {
      const [gravityNodes, k8sNodes] = responses;
      const canSsh = acl.getSshLogins().size > 0;
      const sshLogins = acl.getSshLogins().toJS();
      reactor.dispatch(SITE_SERVERS_RECEIVE, {
        gravityNodes,
        k8sNodes,
        canSsh,
        sshLogins,
      });
    })
}
