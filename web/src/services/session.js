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

import Logger from 'app/lib/logger';
import cfg from 'app/config';
import history from './history';
import api from './api';
import localStorage, { KeysEnum, BearerToken } from './localStorage';

const TOKEN_CHECKER_INTERVAL = 15 * 1000; //  every 15 sec
const logger = Logger.create('services/session');

let sesstionCheckerTimerId = null;

const session = {

  logout() {
    api.delete(cfg.api.sessionPath)
      .always(() => {
        history.goToLogin();
      });

    this.clear();
  },

  clear(){
    this._stopTokenChecker();
    localStorage.unsubscribe(receiveMessage)
    localStorage.setBearerToken(null);
    localStorage.clear();
  },

  // ensureSession verifies that token is valid and starts
  // periodically checking and refreshing the token.
  ensureSession(){
    this._stopTokenChecker();
    this._ensureLocalStorageSubscription();

    if(!this.isValid()){
      this.logout();
      return;
    }

    if(this._shouldRenewToken()){
      this._renewToken()
        .done(() => {
          this._startTokenChecker();
        })
        .fail(this.logout.bind(this));

    }else{
      this._startTokenChecker();
    }
  },

  isValid(){
    return this._timeLeft() > 0;
  },

  _getBearerToken(){
    let token = null;
    try{
      token = this._extractBearerTokenFromHtml();
      if (token) {
        localStorage.setBearerToken(token)
      } else {
        token = localStorage.getBearerToken();
      }

    }catch(err){
      logger.error('Cannot find bearer token', err);
    }

    return token;
  },

  _extractBearerTokenFromHtml() {
    // length of the serialized empty token
    const emptyTokenLength = 20;
    const el = document.querySelector('[name=grv_bearer_token]');
    let token = null;
    if (el !== null) {
      let encodedToken = el.content || '';
      if (encodedToken.length > emptyTokenLength) {
        let decoded = window.atob(encodedToken);
        let json = JSON.parse(decoded);
        token = new BearerToken(json);
      }

      // remove token from HTML as it will be renewed with a time
      // and stored in the localStorage
      el.parentNode.removeChild(el);
    }

    return token;
  },

  _shouldRenewToken(){
    if(this._getIsRenewing()){
      return false;
    }

    /*
    * increase the threshold value for slow connections to avoid
    * access-denied response due to concurrent renew token request
    * made from another tab.
    */
    return this._timeLeft() < TOKEN_CHECKER_INTERVAL * 1.5;
  },

  _renewToken(){
    this._setAndBroadcastIsRenewing(true);
    return api.post(cfg.api.renewTokenPath)
      .then(this._receiveBearerToken.bind(this))
      .always(()=>{
        this._setAndBroadcastIsRenewing(false);
      })
  },

  _receiveBearerToken(json){
    const token = new BearerToken(json);
    localStorage.setBearerToken(token);
  },

  _setAndBroadcastIsRenewing(value){
    this._setIsRenewing(value);
    localStorage.broadcast(KeysEnum.TOKEN_RENEW, value);
  },

  _setIsRenewing(value){
    this._isRenewing = value;
  },

  _getIsRenewing(){
    return !!this._isRenewing;
  },

  _timeLeft(){
    const token = this._getBearerToken();
    if (!token) {
      return 0;
    }

    let { expiresIn, created } = token;
    if(!created || !expiresIn){
      return 0;
    }

    expiresIn = expiresIn * 1000;
    const delta = created + expiresIn - new Date().getTime();
    return delta;
  },

  _shouldCheckStatus(){
    if(this._getIsRenewing()){
      return false;
    }

    /*
    * double the threshold value for slow connections to avoid
    * access-denied response due to concurrent renew token request
    * made from other tab
    */
    return this._timeLeft() > TOKEN_CHECKER_INTERVAL * 2;
  },

  // subsribes to localStorage changes (triggered from other browser tabs)
  _ensureLocalStorageSubscription(){
    localStorage.subscribe(receiveMessage);
  },

  _fetchStatus(){
    api.get(cfg.api.userStatusPath)
    .fail(err => {
      // this indicates that session is no longer valid (caused by server restarts or updates)
      if(err.status == 403){
        this.logout();
      }
    });
  },

  _startTokenChecker(){
    this._stopTokenChecker();

    sesstionCheckerTimerId = setInterval(()=> {
      // calling ensureSession() will again invoke _startTokenChecker
      this.ensureSession();

      // handle server restarts when session may become invalid
      if(this._shouldCheckStatus()){
        this._fetchStatus();
      }

    }, TOKEN_CHECKER_INTERVAL);
  },

  _stopTokenChecker(){
    clearInterval(sesstionCheckerTimerId);
    sesstionCheckerTimerId = null;
  }
}

function receiveMessage(event){
  const { key, newValue } = event;

  // check if logout was triggered from other tabs
  if(localStorage.getBearerToken() === null){
    session.logout();
  }

  // check if token is being renewed from another tab
  if(key === KeysEnum.TOKEN_RENEW && !!newValue){
    session._setIsRenewing(JSON.parse(newValue));
  }
}

export default session;