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
import PropTypes from 'prop-types';
import { ButtonSecondary, ButtonWarning, Text } from 'shared/components';
import * as Alerts from 'shared/components/Alert';
import { useAttempt, withState } from 'shared/hooks';
import Dialog, { DialogHeader, DialogTitle, DialogContent, DialogFooter} from 'shared/components/DialogConfirmation';
import { startShrinkOperation } from 'app/cluster/flux/nodes/actions';

export function DeleteNodeDialog(props){
  const { node, onClose, onDelete, attempt, attemptActions } = props;
  const { id, hostname } = node;

  const onOk = () => {
    attemptActions.do(() => onDelete(id))
      .then(() => onClose());
  };

  const isDisabled = attempt.isProcessing;

  return (
    <Dialog
      disableEscapeKeyDown={isDisabled}
      onClose={onClose}
      open={true}
    >
      <DialogHeader>
        <DialogTitle>
          Deleting Server
        </DialogTitle>
      </DialogHeader>
      <DialogContent mt="0" maxWidth="600px">
        {attempt.isFailed && (
          <Alerts.Danger children={attempt.message} />
        )}
        <Text mb="1">
          You are about to delete instance <Text as="span" bold color="primary.contrastText">{hostname}</Text>
        </Text>
        <Text>
          This operation cannot be undone. Are you sure?
        </Text>
      </DialogContent>
      <DialogFooter>
        <ButtonWarning mr="3" disabled={isDisabled} onClick={onOk}>
          I understand the consequences, delete this server
        </ButtonWarning>
        <ButtonSecondary disabled={isDisabled} onClick={onClose}>
          Cancel
        </ButtonSecondary>
      </DialogFooter>
    </Dialog>
  );
}

DeleteNodeDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
  attempt: PropTypes.object.isRequired,
  attemptActions: PropTypes.object.isRequired,
}

function mapState(){
  const [ attempt, attemptActions ] = useAttempt();
  return {
    onDelete: startShrinkOperation,
    attempt,
    attemptActions
  }
}

export default withState(mapState)(DeleteNodeDialog);