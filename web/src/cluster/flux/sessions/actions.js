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

import reactor from 'app/reactor';
import Logger from 'app/lib/logger';
import { RECEIVE_ACTIVE_SESSIONS  } from './actionTypes';
import { fetchSessions } from 'app/cluster/services/sessions';

const logger = Logger.create('flux/sessions');

export function fetchActiveSessions(){
  return fetchSessions()
    .then(sessions => {
      reactor.dispatch(RECEIVE_ACTIVE_SESSIONS, sessions);
    })
    .fail(err => {
      logger.error('fetchActiveSessions', err);
      throw err;
  })
}