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
import SideNav, { SideNavItem } from '../SideNav'
import LogoButton from '../LogoButton'
import teleportLogo from 'shared/assets/images/teleport-logo.svg';
import cfg from 'app/config';

storiesOf('SideNav', module)
  .addDecorator(withInfo)
  .add('SideNav component', () => {
    return (
      <SideNav static>
        <LogoButton src={teleportLogo} version="3.2.1" href={cfg.routes.app} />
        <SideNavItem>
          Item 1
          </SideNavItem>
        <SideNavItem>
          Item 2
          </SideNavItem>
        <SideNavItem>
          Item 3
          </SideNavItem>
      </SideNav>
    );
  });

