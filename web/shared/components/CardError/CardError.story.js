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

import React from 'react'
import { storiesOf } from '@storybook/react'
import { withInfo } from '@storybook/addon-info'
import { NotFound, AccessDenied, Failed, LoginFailed } from './CardError';

const defProps = {
  width: "500px",
  height: "200px",
  m: "0 auto",
  message: 'some error message'
}

storiesOf('CardError', module)
  .addDecorator(withInfo)
  .add('NotFound', () => (
    <NotFound {...defProps}>
    </NotFound>
  ))
  .add('AccessDenied', () => (
    <AccessDenied {...defProps}>
    </AccessDenied>
  ))
  .add('Failed', () => (
    <Failed {...defProps}>
    </Failed>
  ))
  .add('LoginFailed', () => (
    <LoginFailed {...defProps} loginUrl="https://localhost">
    </LoginFailed>
  ))
