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

import React from 'react';
import cfg from 'app/config';
import * as actions from 'app/flux/user/actions';
import PasswordForm from 'shared/components/FormPassword';
import { FeatureBox, FeatureHeader, FeatureHeaderTitle } from 'oss-app/cluster/components/Layout';

export function Account(props){
  const {
    auth2faType,
    onChangePass,
    onChangePassWithU2f,
    onDestory,
    attempt } = props;

  return (
    <FeatureBox>
      <FeatureHeader>
        <FeatureHeaderTitle>
          Account Settings
        </FeatureHeaderTitle>
      </FeatureHeader>
      <PasswordForm
        auth2faType={auth2faType}
        onChangePass={onChangePass}
        onChangePassWithU2f={onChangePassWithU2f}
        onDestory={onDestory}
        attempt={attempt}
      />
    </FeatureBox>
  );
}

export default function(props){
  const settProps = {
    ...props,
    auth2faType: cfg.getAuth2faType(),
    onChangePass: actions.changePassword,
    onChangePassWithU2f: () => /* not implemented */ null,
    onDestory: () => /* not implemented */ null,
  }

  return <Account {...settProps} />
}