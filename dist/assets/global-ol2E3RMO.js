import{e as k,_ as C,C as L,f as se,h as re,j as Me,F as ce,L as xe,k as Ne,l as $e,m as Be,v as je,n as H,p as Ve,i as Ue,g as Ge,a as ze,s as Ke,b as He,r as W,q as We,t as Ye,w as Je}from"./index.esm2017-CKqBSwm5.js";const le="@firebase/installations",$="0.6.17";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const de=1e4,ue=`w:${$}`,fe="FIS_v2",Qe="https://firebaseinstallations.googleapis.com/v1",Xe=60*60*1e3,Ze="installations",et="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const tt={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},T=new re(Ze,et,tt);function pe(e){return e instanceof ce&&e.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function me({projectId:e}){return`${Qe}/projects/${e}/installations`}function ge(e){return{token:e.token,requestStatus:2,expiresIn:ot(e.expiresIn),creationTime:Date.now()}}async function he(e,t){const o=(await t.json()).error;return T.create("request-failed",{requestName:e,serverCode:o.code,serverMessage:o.message,serverStatus:o.status})}function we({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function nt(e,{refreshToken:t}){const n=we(e);return n.append("Authorization",at(t)),n}async function ye(e){const t=await e();return t.status>=500&&t.status<600?e():t}function ot(e){return Number(e.replace("s","000"))}function at(e){return`${fe} ${e}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function it({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const o=me(e),a=we(e),i=t.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&a.append("x-firebase-client",l)}const s={fid:n,authVersion:fe,appId:e.appId,sdkVersion:ue},r={method:"POST",headers:a,body:JSON.stringify(s)},c=await ye(()=>fetch(o,r));if(c.ok){const l=await c.json();return{fid:l.fid||n,registrationStatus:2,refreshToken:l.refreshToken,authToken:ge(l.authToken)}}else throw await he("Create Installation",c)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ie(e){return new Promise(t=>{setTimeout(t,e)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function st(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rt=/^[cdef][\w-]{21}$/,N="";function ct(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const n=lt(e);return rt.test(n)?n:N}catch{return N}}function lt(e){return st(e).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _(e){return`${e.appName}!${e.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const be=new Map;function ve(e,t){const n=_(e);Te(n,t),dt(n,t)}function Te(e,t){const n=be.get(e);if(n)for(const o of n)o(t)}function dt(e,t){const n=ut();n&&n.postMessage({key:e,fid:t}),ft()}let v=null;function ut(){return!v&&"BroadcastChannel"in self&&(v=new BroadcastChannel("[Firebase] FID Change"),v.onmessage=e=>{Te(e.data.key,e.data.fid)}),v}function ft(){be.size===0&&v&&(v.close(),v=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pt="firebase-installations-database",mt=1,A="firebase-installations-store";let q=null;function B(){return q||(q=Me(pt,mt,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(A)}}})),q}async function R(e,t){const n=_(e),a=(await B()).transaction(A,"readwrite"),i=a.objectStore(A),s=await i.get(n);return await i.put(t,n),await a.done,(!s||s.fid!==t.fid)&&ve(e,t.fid),t}async function Ae(e){const t=_(e),o=(await B()).transaction(A,"readwrite");await o.objectStore(A).delete(t),await o.done}async function D(e,t){const n=_(e),a=(await B()).transaction(A,"readwrite"),i=a.objectStore(A),s=await i.get(n),r=t(s);return r===void 0?await i.delete(n):await i.put(r,n),await a.done,r&&(!s||s.fid!==r.fid)&&ve(e,r.fid),r}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function j(e){let t;const n=await D(e.appConfig,o=>{const a=gt(o),i=ht(e,a);return t=i.registrationPromise,i.installationEntry});return n.fid===N?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}function gt(e){const t=e||{fid:ct(),registrationStatus:0};return Se(t)}function ht(e,t){if(t.registrationStatus===0){if(!navigator.onLine){const a=Promise.reject(T.create("app-offline"));return{installationEntry:t,registrationPromise:a}}const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},o=wt(e,n);return{installationEntry:n,registrationPromise:o}}else return t.registrationStatus===1?{installationEntry:t,registrationPromise:yt(e)}:{installationEntry:t}}async function wt(e,t){try{const n=await it(e,t);return R(e.appConfig,n)}catch(n){throw pe(n)&&n.customData.serverCode===409?await Ae(e.appConfig):await R(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}async function yt(e){let t=await Y(e.appConfig);for(;t.registrationStatus===1;)await Ie(100),t=await Y(e.appConfig);if(t.registrationStatus===0){const{installationEntry:n,registrationPromise:o}=await j(e);return o||n}return t}function Y(e){return D(e,t=>{if(!t)throw T.create("installation-not-found");return Se(t)})}function Se(e){return It(e)?{fid:e.fid,registrationStatus:0}:e}function It(e){return e.registrationStatus===1&&e.registrationTime+de<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function bt({appConfig:e,heartbeatServiceProvider:t},n){const o=vt(e,n),a=nt(e,n),i=t.getImmediate({optional:!0});if(i){const l=await i.getHeartbeatsHeader();l&&a.append("x-firebase-client",l)}const s={installation:{sdkVersion:ue,appId:e.appId}},r={method:"POST",headers:a,body:JSON.stringify(s)},c=await ye(()=>fetch(o,r));if(c.ok){const l=await c.json();return ge(l)}else throw await he("Generate Auth Token",c)}function vt(e,{fid:t}){return`${me(e)}/${t}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function V(e,t=!1){let n;const o=await D(e.appConfig,i=>{if(!Ee(i))throw T.create("not-registered");const s=i.authToken;if(!t&&St(s))return i;if(s.requestStatus===1)return n=Tt(e,t),i;{if(!navigator.onLine)throw T.create("app-offline");const r=kt(i);return n=At(e,r),r}});return n?await n:o.authToken}async function Tt(e,t){let n=await J(e.appConfig);for(;n.authToken.requestStatus===1;)await Ie(100),n=await J(e.appConfig);const o=n.authToken;return o.requestStatus===0?V(e,t):o}function J(e){return D(e,t=>{if(!Ee(t))throw T.create("not-registered");const n=t.authToken;return Ct(n)?Object.assign(Object.assign({},t),{authToken:{requestStatus:0}}):t})}async function At(e,t){try{const n=await bt(e,t),o=Object.assign(Object.assign({},t),{authToken:n});return await R(e.appConfig,o),n}catch(n){if(pe(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await Ae(e.appConfig);else{const o=Object.assign(Object.assign({},t),{authToken:{requestStatus:0}});await R(e.appConfig,o)}throw n}}function Ee(e){return e!==void 0&&e.registrationStatus===2}function St(e){return e.requestStatus===2&&!Et(e)}function Et(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+Xe}function kt(e){const t={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},e),{authToken:t})}function Ct(e){return e.requestStatus===1&&e.requestTime+de<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Lt(e){const t=e,{installationEntry:n,registrationPromise:o}=await j(t);return o?o.catch(console.error):V(t).catch(console.error),n.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Rt(e,t=!1){const n=e;return await Pt(n),(await V(n,t)).token}async function Pt(e){const{registrationPromise:t}=await j(e);t&&await t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _t(e){if(!e||!e.options)throw M("App Configuration");if(!e.name)throw M("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw M(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function M(e){return T.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ke="installations",Dt="installations-internal",Ot=e=>{const t=e.getProvider("app").getImmediate(),n=_t(t),o=se(t,"heartbeat");return{app:t,appConfig:n,heartbeatServiceProvider:o,_delete:()=>Promise.resolve()}},Ft=e=>{const t=e.getProvider("app").getImmediate(),n=se(t,ke).getImmediate();return{getId:()=>Lt(n),getToken:a=>Rt(n,a)}};function qt(){C(new L(ke,Ot,"PUBLIC")),C(new L(Dt,Ft,"PRIVATE"))}qt();k(le,$);k(le,$,"esm2017");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Q="analytics",Mt="firebase_id",xt="origin",Nt=60*1e3,$t="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",U="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const f=new xe("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bt={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},m=new re("analytics","Analytics",Bt);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jt(e){if(!e.startsWith(U)){const t=m.create("invalid-gtag-resource",{gtagURL:e});return f.warn(t.message),""}return e}function Ce(e){return Promise.all(e.map(t=>t.catch(n=>n)))}function Vt(e,t){let n;return window.trustedTypes&&(n=window.trustedTypes.createPolicy(e,t)),n}function Ut(e,t){const n=Vt("firebase-js-sdk-policy",{createScriptURL:jt}),o=document.createElement("script"),a=`${U}?l=${e}&id=${t}`;o.src=n?n==null?void 0:n.createScriptURL(a):a,o.async=!0,document.head.appendChild(o)}function Gt(e){let t=[];return Array.isArray(window[e])?t=window[e]:window[e]=t,t}async function zt(e,t,n,o,a,i){const s=o[a];try{if(s)await t[s];else{const c=(await Ce(n)).find(l=>l.measurementId===a);c&&await t[c.appId]}}catch(r){f.error(r)}e("config",a,i)}async function Kt(e,t,n,o,a){try{let i=[];if(a&&a.send_to){let s=a.send_to;Array.isArray(s)||(s=[s]);const r=await Ce(n);for(const c of s){const l=r.find(g=>g.measurementId===c),u=l&&t[l.appId];if(u)i.push(u);else{i=[];break}}}i.length===0&&(i=Object.values(t)),await Promise.all(i),e("event",o,a||{})}catch(i){f.error(i)}}function Ht(e,t,n,o){async function a(i,...s){try{if(i==="event"){const[r,c]=s;await Kt(e,t,n,r,c)}else if(i==="config"){const[r,c]=s;await zt(e,t,n,o,r,c)}else if(i==="consent"){const[r,c]=s;e("consent",r,c)}else if(i==="get"){const[r,c,l]=s;e("get",r,c,l)}else if(i==="set"){const[r]=s;e("set",r)}else e(i,...s)}catch(r){f.error(r)}}return a}function Wt(e,t,n,o,a){let i=function(...s){window[o].push(arguments)};return window[a]&&typeof window[a]=="function"&&(i=window[a]),window[a]=Ht(i,e,t,n),{gtagCore:i,wrappedGtag:window[a]}}function Yt(e){const t=window.document.getElementsByTagName("script");for(const n of Object.values(t))if(n.src&&n.src.includes(U)&&n.src.includes(e))return n;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jt=30,Qt=1e3;class Xt{constructor(t={},n=Qt){this.throttleMetadata=t,this.intervalMillis=n}getThrottleMetadata(t){return this.throttleMetadata[t]}setThrottleMetadata(t,n){this.throttleMetadata[t]=n}deleteThrottleMetadata(t){delete this.throttleMetadata[t]}}const Le=new Xt;function Zt(e){return new Headers({Accept:"application/json","x-goog-api-key":e})}async function en(e){var t;const{appId:n,apiKey:o}=e,a={method:"GET",headers:Zt(o)},i=$t.replace("{app-id}",n),s=await fetch(i,a);if(s.status!==200&&s.status!==304){let r="";try{const c=await s.json();!((t=c.error)===null||t===void 0)&&t.message&&(r=c.error.message)}catch{}throw m.create("config-fetch-failed",{httpStatus:s.status,responseMessage:r})}return s.json()}async function tn(e,t=Le,n){const{appId:o,apiKey:a,measurementId:i}=e.options;if(!o)throw m.create("no-app-id");if(!a){if(i)return{measurementId:i,appId:o};throw m.create("no-api-key")}const s=t.getThrottleMetadata(o)||{backoffCount:0,throttleEndTimeMillis:Date.now()},r=new an;return setTimeout(async()=>{r.abort()},Nt),Re({appId:o,apiKey:a,measurementId:i},s,r,t)}async function Re(e,{throttleEndTimeMillis:t,backoffCount:n},o,a=Le){var i;const{appId:s,measurementId:r}=e;try{await nn(o,t)}catch(c){if(r)return f.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${r} provided in the "measurementId" field in the local Firebase config. [${c==null?void 0:c.message}]`),{appId:s,measurementId:r};throw c}try{const c=await en(e);return a.deleteThrottleMetadata(s),c}catch(c){const l=c;if(!on(l)){if(a.deleteThrottleMetadata(s),r)return f.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${r} provided in the "measurementId" field in the local Firebase config. [${l==null?void 0:l.message}]`),{appId:s,measurementId:r};throw c}const u=Number((i=l==null?void 0:l.customData)===null||i===void 0?void 0:i.httpStatus)===503?H(n,a.intervalMillis,Jt):H(n,a.intervalMillis),g={throttleEndTimeMillis:Date.now()+u,backoffCount:n+1};return a.setThrottleMetadata(s,g),f.debug(`Calling attemptFetch again in ${u} millis`),Re(e,g,o,a)}}function nn(e,t){return new Promise((n,o)=>{const a=Math.max(t-Date.now(),0),i=setTimeout(n,a);e.addEventListener(()=>{clearTimeout(i),o(m.create("fetch-throttle",{throttleEndTimeMillis:t}))})})}function on(e){if(!(e instanceof ce)||!e.customData)return!1;const t=Number(e.customData.httpStatus);return t===429||t===500||t===503||t===504}class an{constructor(){this.listeners=[]}addEventListener(t){this.listeners.push(t)}abort(){this.listeners.forEach(t=>t())}}async function sn(e,t,n,o,a){if(a&&a.global){e("event",n,o);return}else{const i=await t,s=Object.assign(Object.assign({},o),{send_to:i});e("event",n,s)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function rn(){if(Be())try{await je()}catch(e){return f.warn(m.create("indexeddb-unavailable",{errorInfo:e==null?void 0:e.toString()}).message),!1}else return f.warn(m.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function cn(e,t,n,o,a,i,s){var r;const c=tn(e);c.then(w=>{n[w.measurementId]=w.appId,e.options.measurementId&&w.measurementId!==e.options.measurementId&&f.warn(`The measurement ID in the local Firebase config (${e.options.measurementId}) does not match the measurement ID fetched from the server (${w.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(w=>f.error(w)),t.push(c);const l=rn().then(w=>{if(w)return o.getId()}),[u,g]=await Promise.all([c,l]);Yt(i)||Ut(i,u.measurementId),a("js",new Date);const I=(r=s==null?void 0:s.config)!==null&&r!==void 0?r:{};return I[xt]="firebase",I.update=!0,g!=null&&(I[Mt]=g),a("config",u.measurementId,I),u.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ln{constructor(t){this.app=t}_delete(){return delete E[this.app.options.appId],Promise.resolve()}}let E={},X=[];const Z={};let x="dataLayer",dn="gtag",ee,Pe,te=!1;function un(){const e=[];if($e()&&e.push("This is a browser extension environment."),Ve()||e.push("Cookies are not available."),e.length>0){const t=e.map((o,a)=>`(${a+1}) ${o}`).join(" "),n=m.create("invalid-analytics-context",{errorInfo:t});f.warn(n.message)}}function fn(e,t,n){un();const o=e.options.appId;if(!o)throw m.create("no-app-id");if(!e.options.apiKey)if(e.options.measurementId)f.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${e.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw m.create("no-api-key");if(E[o]!=null)throw m.create("already-exists",{id:o});if(!te){Gt(x);const{wrappedGtag:i,gtagCore:s}=Wt(E,X,Z,x,dn);Pe=i,ee=s,te=!0}return E[o]=cn(e,X,Z,t,ee,x,n),new ln(e)}function pn(e,t,n,o){e=Ne(e),sn(Pe,E[e.app.options.appId],t,n,o).catch(a=>f.error(a))}const ne="@firebase/analytics",oe="0.10.16";function mn(){C(new L(Q,(t,{options:n})=>{const o=t.getProvider("app").getImmediate(),a=t.getProvider("installations-internal").getImmediate();return fn(o,a,n)},"PUBLIC")),C(new L("analytics-internal",e,"PRIVATE")),k(ne,oe),k(ne,oe,"esm2017");function e(t){try{const n=t.getProvider(Q).getImmediate();return{logEvent:(o,a,i)=>pn(n,o,a,i)}}catch(n){throw m.create("interop-component-reg-failed",{reason:n})}}}mn();const p=e=>{const n=e.closest(".input-box").querySelector(".error-message");n&&(n.classList.remove("show"),setTimeout(()=>{n.remove()},300)),e.classList.remove("error")},P=(e,t)=>{const n=e.closest(".input-box");let o=n.querySelector(".error-message");o||(o=document.createElement("div"),o.classList.add("error-message"),n.appendChild(o)),o.textContent=t,o.classList.add("show"),e.classList.add("error")},_e=e=>{p(e);const t=e.value.trim();return t?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)?!0:(P(e,"Please enter a valid email address."),!1):(P(e,"Email is required."),!1)},De=e=>{p(e);const t=e.value;return t?t.length<8?(P(e,"Password must be at least 8 characters long."),!1):!0:(P(e,"Password is required."),!1)};document.addEventListener("DOMContentLoaded",()=>{const e=document.querySelector(".container"),t=document.querySelector(".login-btn"),n=document.querySelector(".assist-btn"),o=document.querySelector(".login form"),a=document.querySelector(".assistance"),i=document.querySelector(".login-back-btn"),s=document.getElementById("login-password"),r=document.getElementById("login-email"),c=document.querySelector(".bxs-lock-alt"),l=document.querySelector(".bxs-lock-open-alt");l.style.display="none",e||console.error("Container not found"),t||console.error("Login button not found"),n||console.error("Assistance button not found"),o||console.error("Login form not found"),a||console.error("Assistance box not found"),i||console.error("Back button not found"),s||console.error("Password input not found"),r||console.error("Email input not found"),c||console.error("Closed lock icon not found"),l||console.error("Open lock icon not found"),o&&o.addEventListener("submit",u=>{const g=_e(),I=De();(!g||!I)&&(u.preventDefault(),console.log("Login failed due to client-side validation errors."))}),a&&o&&n&&n.addEventListener("click",()=>{e.classList.add("active"),o.reset(),p(r),p(s)}),t&&a&&e&&t.addEventListener("click",()=>{e.classList.remove("active"),p(r),p(s)}),i&&i.addEventListener("click",()=>{window.location.href="../index.html"}),c&&l&&s&&(c.addEventListener("click",()=>{s.type="text",c.style.display="none",l.style.display="inline-block"}),l.addEventListener("click",()=>{s.type="password",l.style.display="none",c.style.display="inline-block"})),r&&r.addEventListener("focus",()=>{p(r)}),s&&s.addEventListener("focus",()=>{p(s)})});const gn={apiKey:"AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",authDomain:"bayanihan-5ce7e.firebaseapp.com",databaseURL:"https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"bayanihan-5ce7e",storageBucket:"bayanihan-5ce7e.appspot.com",messagingSenderId:"593123849917",appId:"1:593123849917:web:eb85a63a536eeff78ce9d4",measurementId:"G-ZTQ9VXXVV0"},Oe=Ue(gn),ae=Ge(Oe),ie=ze(Oe),b=(e,t="error")=>{const n=document.querySelector(".toast-container");if(!n){console.error("Toast container not found!");return}const o=document.createElement("div");o.className=`toast ${t}`,o.textContent=e,n.appendChild(o),setTimeout(()=>o.classList.add("show"),10),setTimeout(()=>{o.classList.remove("show"),setTimeout(()=>o.remove(),300)},4e3)};document.addEventListener("DOMContentLoaded",()=>{const e=document.querySelector(".container"),t=document.querySelector(".register-btn"),n=document.querySelector(".login-btn"),o=document.querySelector(".login form"),a=document.getElementById("login-email"),i=document.getElementById("login-password"),s=new URLSearchParams(window.location.search),r=s.get("mode"),c=s.get("oobCode");r==="verifyEmail"&&c&&(b("Email verified successfully! Please log in."),window.history.replaceState({},document.title,"pages/login.html")),t&&e&&t.addEventListener("click",()=>{e.classList.add("active"),o&&o.reset(),a&&p(a),i&&p(i)}),n&&e&&n.addEventListener("click",()=>{e.classList.remove("active"),a&&p(a),i&&p(i)}),o&&a&&i&&o.addEventListener("submit",async l=>{l.preventDefault();const u=_e(a),g=De(i);if(!u||!g){b("Please correct the errors in the form.","error"),console.log("Login failed due to client-side validation errors.");return}const I=a.value.trim(),w=i.value;console.log("Attempting to sign in with email:",{email:I});try{const y=(await Ke(ae,I,w)).user;let d=(await He(W(ie,`users/${y.uid}`))).val();d||(console.warn("User data not found in Realtime Database for UID:",y.uid,"Creating a default entry."),d={role:"ABVN",name:"New User",group:"N/A",contactPerson:"N/A",email:y.email,mobile:"",createdAt:new Date().toISOString(),emailVerified:y.emailVerified,isFirstLogin:!0,termsAccepted:!1,terms_agreed_version:0},await We(W(ie,`users/${y.uid}`),d));const G=(d==null?void 0:d.role)==="AB ADMIN"||(d==null?void 0:d.role)==="admin";if(!G&&!y.emailVerified){try{const h={url:"../pages/login.html",handleCodeInApp:!1};console.log("Sending verification email to:",y.email),await Ye(y,h),console.log("Verification email sent successfully to:",y.email),b("Your email address is not verified. A verification email has been sent to your email address. Please verify your email to proceed with login (check spam/junk folder).")}catch(h){console.error("Error sending verification email:",h),b("Failed to send verification email: "+h.message)}await Je(ae);return}const O=d.isFirstLogin===!0,F=d.termsAccepted===!0,Fe=d.terms_agreed_version||0,z={name:d.name||"",role:d.role||"",group:d.group||"",contactPerson:d.contactPerson||"",isFirstLogin:O,termsAccepted:F,terms_agreed_version:Fe};console.log("User Data being stored in localStorage:",z),localStorage.setItem("userData",JSON.stringify(z)),localStorage.setItem("userEmail",y.email),localStorage.setItem("userRole",d.role),b("Login successful!","success");const qe=new Event("updateSidebar");window.dispatchEvent(qe),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then(h=>{var K;(K=h.active)==null||K.postMessage({type:"UPDATE_CACHE"})}).catch(h=>{console.error("Service Worker error:",h)}),setTimeout(()=>{if(G&&!O&&F)console.log("Redirecting Admin to dashboard."),window.location.replace("../pages/dashboard.html");else if(O||!F)console.log("Redirecting to profile.html for first login or unaccepted terms."),window.location.replace("../pages/profile.html");else{console.log("Redirecting based on role.");const h=d.role;h==="ABVN"||console.error("Unknown user role or unhandled redirection:",h),window.location.replace("../pages/dashboard.html")}},2e3)}catch(S){S.code==="auth/invalid-credential"||S.code==="auth/user-not-found"||S.code==="auth/wrong-password"?b("Invalid email or password.","error"):(b("An error occurred during login: "+S.message),console.error("Login error:",S))}})});
