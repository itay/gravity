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
import { ProviderEnum } from 'app/services/enums';
import { Table, Column, Cell, TextCell } from 'shared/components/DataTable';
import { Label, Text } from 'shared/components';
import MenuLogin from './../MenuLogin';
import NodeMenuActon from './NodeMenuAction';

const PrivateIPCell = ({ rowIndex, data}) => {
  const { advertiseIp } = data[rowIndex];
  return (
    <Cell>
      {advertiseIp}
    </Cell>
  );
}

const LoginCell = ({ rowIndex, data}) => {
  const { sshLogins, id, hostname } = data[rowIndex];
  return (
    <Cell>
      <MenuLogin serverId={hostname || id} logins={sshLogins} />
    </Cell>
  );
}

export const ActionCell = ({ rowIndex, onDelete, data}) => {
  const node = data[rowIndex];
  return (
    <Cell>
      <NodeMenuActon onDelete={() => onDelete(node)} />
    </Cell>
  )
}

function Detail({ children }){
  return (
    <Text typography="body2" color="text.primary">{children}</Text>
  )
}

const NameCell = ({ rowIndex, data }) => {
  const { k8s, instanceType } = data[rowIndex];
  const { cpu, osImage, memory, name } = k8s;
  const desc = `cpu: ${cpu}, ram: ${memory}, os: ${osImage}`;
  return (
    <Cell>
      <Text typography="body2" mb="2" bold>{name}</Text>
      <Detail>{desc}</Detail>
      { instanceType && <Detail>Instance Type: {instanceType} </Detail> }
    </Cell>
  )
};

export function LabelCell({ rowIndex, data }){
  const { k8s } = data[rowIndex];
  const labels  = k8s.labels || {};
  const $labels = Object.getOwnPropertyNames(labels).map(name => (
    <Label mb="1" mr="1" key={name} kind="secondary">
      {`${name}: ${labels[name]}`}
    </Label>
  ));

  return (
    <Cell>
      {$labels}
    </Cell>
  )
}

class NodeList extends React.Component {
  render() {
    const { nodes, provider, onDelete } = this.props;
    const isAws = provider === ProviderEnum.AWS;
    return (
      <StyledTable data={nodes} rowCount={nodes.length}>
        <Column
          header={<Cell>Login</Cell> }
          cell={<LoginCell /> }
        />
        <Column
          header={<Cell>Name</Cell> }
          cell={<NameCell /> }
        />
        <Column
          header={<Cell>Labels</Cell> }
          cell={<LabelCell /> }
        />
        <Column
          header={<Cell>Private IP</Cell> }
          cell={<PrivateIPCell /> }
        />
        <Column
          columnKey="publicIp"
          header={<Cell>Public IP</Cell> }
          cell={<TextCell/> }
        />
        <Column
          columnKey="hostname"
          header={<Cell>Hostname</Cell> }
          cell={<TextCell/> }
        />
        <Column
          columnKey="displayRole"
          header={<Cell>Profile</Cell> }
          cell={<TextCell/> }
        />
        { isAws &&
          <Column
            columnKey="instanceType"
            header={<Cell>Instance Type</Cell> }
            cell={<TextCell /> }
          />
        }
        <Column
          header={<Cell>Actions</Cell> }
          cell={ <ActionCell onDelete={onDelete} /> }
        />
      </StyledTable>
    )
  }
}

const StyledTable = styled(Table)`
  & > tbody > tr > td  {
    vertical-align: baseline;
  }
`

export default NodeList;
