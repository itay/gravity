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
import styled from 'styled-components'
import Button from '../Button';
import { fade } from '../../theme/utils/colorManipulator';
import Icon from '../Icon';
import { pickSsoIcon } from './utils';

const TypeEnum = {
  MICROSOFT: 'microsoft',
  GITHUB: 'github',
  BITBUCKET: 'bitbucket',
  GOOGLE: 'google',
};

const ButtonSso = props => {
  const { ssoType, ...rest } = props;
  const { color, Icon } = pickSsoIcon(ssoType);
  return (
    <StyledButton color={color} block {...rest}>
      {Boolean(Icon) && (
        <IconBox>
          <Icon />
        </IconBox>
      )}
      {props.children}
    </StyledButton>
  )
}

const StyledButton = styled(Button)`
  background-color: ${ props => props.color};
  display: block;
  width: 100%;

  &:hover, &:focus {
    background: ${ props => fade(props.color, 0.4 ) };
  }
  height: 48px;
  position: relative;
  box-sizing: border-box;

  ${Icon} {
    font-size: 20px;
    margin: -10px 0 0 0;
    opacity: .87;
    position: absolute;
    top: 50%;
    left: 16px;
  }
`

const IconBox = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 56px;
  font-size: 24px;
  text-align: center;
  border-right: 1px solid rgba(0,0,0,.2);
`

export default ButtonSso;
export {
  TypeEnum,
  pickSsoIcon
}