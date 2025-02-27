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
import { Link } from 'react-router-dom';
import { Flex, Box, Text, ButtonSecondary } from 'shared/components';
import { withState } from 'shared/hooks';
import { useFluxStore } from 'app/components/nuclear';
import EventList from 'app/cluster/components/Audit/EventList';
import { getters } from 'app/cluster/flux/events';
import AjaxPoller from 'app/components/dataProviders'
import { fetchLatest } from 'app/cluster/flux/events/actions';
import * as featureFlags from 'app/cluster/featureFlags';

const POLL_INTERVAL = 5000; // every 5 sec

export function LatestEventList({ visible, onRefresh, events, ...rest}) {
  if( !visible ){
    return null;
  }

  return (
    <Box {...rest}>
      <Flex  bg="primary.light" p="3" alignItems="center" justifyContent="space-between">
        <Text typography="h4">
          Audit Logs
        </Text>
        <ButtonSecondary size="small" as={Link} to={cfg.getSiteAuditRoute()}>
          VIEW ALL
        </ButtonSecondary>
      </Flex>
      <EventList events={events} limit="4"/>
      <AjaxPoller time={POLL_INTERVAL} onFetch={onRefresh} />
    </Box>
  );
}

export default withState(() => {
  const store = useFluxStore(getters.store);
  const events = store.getEvents();

  function onRefresh(){
    return fetchLatest();
  }

  return {
    events,
    onRefresh,
    visible: featureFlags.clusterEvents()
  }
})(LatestEventList)