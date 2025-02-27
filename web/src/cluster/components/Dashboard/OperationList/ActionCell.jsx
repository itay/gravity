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
import { NavLink } from 'app/components/Router';
import cfg from 'app/config';
import { Cell } from 'shared/components/DataTable';
import { ButtonPrimary, ButtonSecondary } from 'shared/components';

export default function ActionCell({ rowIndex, data }) {
  const { isSession, session, operation } = data[rowIndex];
  if(!isSession){
    return renderOperationCell(operation);
  }

  return renderSessionCell(session);
}

function renderSessionCell(session){
  const { sid } = session;
  const url = cfg.getConsoleSessionRoute({sid})
  return (
    <Cell align="right">
      <ButtonPrimary as="a" target="_blank"
        href={url}
        size="small" width="90px" children="join"
      />
    </Cell>
  )
}

function renderOperationCell(operation){
  const { id } = operation;
  const url = cfg.getSiteLogQueryRoute({ query:  `file:${id}` });
  return (
    <Cell align="right">
      <ButtonSecondary as={NavLink} to={url} size="small"  width="90px">
        VIEW LOGS
      </ButtonSecondary>
    </Cell>
  )
}