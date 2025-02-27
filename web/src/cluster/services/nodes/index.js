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

import api from 'app/services/api';
import cfg from 'app/config';
import { map } from 'lodash';

export function fetchNodes(){
  return api.get(cfg.getSiteServersUrl(cfg.defaultSiteId))
    .then(json => map(json, makeNode));
}

function makeNode(json){
  const role = json.role;
  const publicIp = json.public_ipv4;
  const advertiseIp = json.advertise_ip;
  const hostname = json.hostname;
  const id = json.id;
  const instanceType = json.instance_type;
  const displayRole = json.display_role || role;
  return {
    publicIp,
    advertiseIp,
    hostname,
    id,
    instanceType,
    role,
    displayRole,
  }
}