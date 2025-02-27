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

import defaultTheme from './../../theme';
import PropTypes from 'prop-types';
import styled from 'styled-components'
import { fontSize, color, space } from 'styled-system'

const defVals  = {
  theme: defaultTheme,
  fontSize: 1,
  px: 3,
  color: 'text.onLight',
  bg: 'light'
}

const fromTheme = props => {
  const values = {
    ...defVals,
    ...props
  }
  return {
    ...fontSize(values),
    ...space(values),
    ...color(values),
    fontWeight: values.theme.bold,
    "&:hover, &:focus": {
      background: values.theme.colors.grey[100],
    }
  }
}

const MenuItem = styled.div`
  line-height: 40px;
  box-sizing: content-box;
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  overflow: hidden;
  text-decoration: none;
  white-space: nowrap;
  &:hover,
  &:focus {
    text-decoration: none;
  }

  ${fromTheme}
`

MenuItem.displayName = 'MenuItem';
MenuItem.propTypes = {
  /**
   * Menu item contents.
   */
  children: PropTypes.node,
};

export default MenuItem;