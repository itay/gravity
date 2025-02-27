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
import { Text, Alert, Card } from 'shared/components';

export default function CardError({children}) {
  return (
    <Card
      color='text.onLight'
      bg='light'
      width='540px'
      mx='auto'
      my={6}
      p={5}
      children={children}
    />
  )
}

const Header = props =>  (
  <Text typography="h1" mb={3} textAlign="center" children={props.children}/>
)

const Content = ({ message='', desc }) => {
  const $desc = desc ? <Text typography="body2">{desc}</Text> : null;
  const $errMessage = message ? <Alert mt={2}>{ message }</Alert> : null;
  return (
    <div>
      {$errMessage} {$desc}
    </div>
  );
}

export const NotFound = ({ message }) => (
  <CardError>
    <Header>404 Not Found</Header>
    <Content message={message}/>
  </CardError>
)

export const AccessDenied = ({ message}) => (
  <CardError>
    <Header>Access denied</Header>
    <Content message={message}/>
  </CardError>
)

export const Failed = ({message}) => (
  <CardError>
    <Header>Internal Error</Header>
    <Content message={message}/>
  </CardError>
)

export const LoginFailed = ({ message, loginUrl }) => (
  <CardError>
    <Header>Login unsuccessful</Header>
    <Content
      message={message}
      desc={(
        <Text typography="body1">
          <HyperLink href={loginUrl}>Please try again</HyperLink>, if the problem persists, contact your system administrator.
        </Text>
      )}/>
  </CardError>
)

const HyperLink = styled.a`
  color: ${({ theme }) => theme.colors.link};
`