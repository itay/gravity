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
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { space, color, width } from 'shared/system';
import defaultTheme from 'shared/theme'

const kindColors = props => {
  const { kindColor, theme } = props;
  switch (kindColor) {
    case 'danger':
      return {
        background: theme.colors.danger,
        color: theme.colors.primary.contrastText
      }
    case 'info':
      return {
        background: theme.colors.info,
        color: theme.colors.primary.contrastText
      }
    case 'warning':
      return {
        background: theme.colors.warning,
        color: theme.colors.primary.contrastText
      }
    case 'success':
      return {
        background: theme.colors.success,
        color: theme.colors.primary.contrastText
      }
    default:
      return {
        background: theme.colors.danger,
        color: theme.colors.primary.contrastText
      }
  }
}

const Alert = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  box-sizing: border-box;
  box-shadow: 0 0 2px rgba(0, 0, 0, .12),  0 2px 2px rgba(0, 0, 0, .24);
  font-weight: ${({theme}) => theme.fontWeights.bold};
  font-size: 16px;
  margin: 0 0 16px 0;
  min-height: 56px;
  padding: 16px;
  overflow: auto;
  word-break: break-all;
  ${space}
  ${kindColors}
  ${width}
`;

Alert.propTypes = {
  kind: PropTypes.oneOf(['danger', 'info', 'warning', 'success']),
  ...color.propTypes,
  ...space.propTypes,
  ...width.propTypes,
};

Alert.defaultProps = {
  kindColor: 'danger',
  theme: defaultTheme,
};

Alert.displayName = 'Alert';

export default Alert;
export const Danger = props => <Alert kindColor="danger" {...props} />
export const Info = props => <Alert kindColor="info" {...props} />
export const Warning = props => <Alert kindColor="warning" {...props} />
export const Success = props => <Alert kindColor="success" {...props} />