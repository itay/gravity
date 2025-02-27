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

import { at, values, map, sortBy } from 'lodash';
import { ServerVarEnums } from 'app/services/enums';

export default function makeAgentServers(json){
  const [ servers ] = at(json, [ 'servers' ]);

  const agentServers = map(servers, srv => {
    const mountVars = makeMountVars(srv);
    const interfaceVars = makeInterfaceVars(srv);
    const vars = [...interfaceVars, ...mountVars];
    return {
      role: srv.role,
      hostname: srv.hostname,
      vars,
      os: srv.os
    }
  })

  return sortBy(agentServers, s => s.hostname );
}

function makeMountVars(json){
  const mounts =  map(json.mounts, mnt => {
    return {
      name: mnt.name,
      type: ServerVarEnums.MOUNT,
      value: mnt.source,
      options: []
    }
  });

  return sortBy(mounts, m => m.name);
}

function makeInterfaceVars(json){
  const defaultValue = json['advertise_addr'];
  const options = values(json.interfaces)
    .map(value => {
      return value['ipv4_addr']
    })
    .sort();

  return [{
    type: ServerVarEnums.INTERFACE,
    value: defaultValue || options[0],
    options
  }]
}

/*


{
  "message": "servers [node-1] are up, waiting for -1 more",
  "servers": [{
    "hostname": "node-1",
    "interfaces": {
      "eth0": {
        "ipv4_addr": "192.168.121.69",
        "name": "eth0"
      },
      "eth1": {
        "ipv4_addr": "172.28.128.101",
        "name": "eth1"
      },
      "eth2": {
        "ipv4_addr": "172.29.128.101",
        "name": "eth2"
      }
    },
    "devices": [{
      "name": "/dev/vda1",
      "type": "part",
      "size_mb": 1
    }],
    "role": "node",
    "os": {
      "name": "centos",
      "like": ["rhel", "fedora"],
      "version": "7.4.1708"
    },
    "mounts": null
  }],
  "docker": {
    "storageDriver": "overlay2",
    "capacity": "4.0GB"
  }
}


*/