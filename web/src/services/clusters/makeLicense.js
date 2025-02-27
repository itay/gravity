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

import { at } from 'lodash';
import { SiteReasonEnum } from 'app/services/enums';

export default function makeLicense(json) {
  const [reason, raw, payload, payloadExpiration, ] = at(json,
    [
      'reason',
      'license.raw',
      'license.payload',
      'license.payload.expiration',
    ]
  );

  if(!payload){
    return null;
  }

  const isValid = reason === SiteReasonEnum.INVALID_LICENSE;
  return {
    raw,
    info: {
      ...payload,
      signature: '',
      expiration: new Date(payloadExpiration).toGMTString()
    },
    status: {
      isActive: !isValid,
      isError: isValid,
    }
  }
}