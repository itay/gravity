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
import $ from 'jQuery';
import { merge } from 'lodash';
import { storiesOf } from '@storybook/react';
import Installer from './Installer';
import InstallerStore from './store';
import longLogoSvg from 'shared/assets/images/sample-logo-long.svg';
import { makeApplication } from 'app/services/applications';
import { makeAgentServers } from 'app/installer/services';
import { app, appWithEula, appWithLicense } from './fixtures';

storiesOf('GravityInstaller', module)
  .add('StepProvider', () => {
    return makeInstaller({
      service: {
        fetchApp: () => $.Deferred().resolve(makeApplication(app))
      }
    });
  })
  .add('StepCapacityAws', () => {
    const store = new InstallerStore();
    store.setState(stateCapacityAws)
    return makeInstaller({
      store,
      siteId: 'siteId',
      service: {
        startInstall: () => $.Deferred().reject(new Error('server error')),
        fetchClusterDetails: () => $.Deferred()
      }
    });
  })
  .add('StepCapacityOnPrem', () => {
    const store = new InstallerStore();
    store.setState(stateCapacityOnPrem)

    return makeInstaller({
      store,
      siteId: 'siteId',
      service: {
        fetchClusterDetails: () => $.Deferred(),
        fetchAgentReport: () => $.Deferred(),
        startInstall: () => $.Deferred().reject(new Error('server error')),
        verifyOnPrem: () => $.Deferred().reject(new Error('server error'))
      }
    });
  })
  .add('Loading', () => {
    return makeInstaller({
      service: {
        fetchApp: () => $.Deferred()
      }
    });
  })
  .add('Error', () => {
    return makeInstaller({
      service: {
        fetchApp: () => $.Deferred().reject(new Error("server side error"))
      }
    });
  })
  .add('Eula', () => {
    return makeInstaller({
      service: {
        fetchApp: () => $.Deferred().resolve(makeApplication(appWithEula))
      }
    });
  })
  .add('StepLicense', () => {
    return makeInstaller({
      service: {
        fetchApp: () => $.Deferred().resolve(makeApplication(appWithLicense))
      }
    });
  })
  .add('Long Logo', () => {
    const mulesoftApp = merge({}, app, {
      manifest: {
        logo: longLogoSvg
      }
    })
    return makeInstaller({
      service: {
        fetchApp: () => $.Deferred().resolve(makeApplication(mulesoftApp))
      }
    });
  })

  function makeInstaller({ store, service, siteId }){
    const props = {
      store,
      service,
      match: {
        params: {
          siteId
        }
      }
    }

    return (
      <Installer  {...props} />
    )
  }


const stateCapacityAws =
  {
    "step": "provision",
    "stepOptions": [
      {
        "value": "new_app",
        "title": "Provider"
      },
      {
        "value": "provision",
        "title": "Capacity"
      },
      {
        "value": "progress",
        "title": "Installation"
      }
    ],
    "license": null,
    "status": "ready",
    "config": {
      "enableTags": true,
      "eulaAgreeText": "I Agree To The Terms",
      "eulaHeaderText": "Welcome to the {0} Installer",
      "eulaContentLabelText": "License Agreement",
      "licenseHeaderText": "Enter your license",
      "licenseOptionTrialText": "Trial without license",
      "licenseOptionText": "With a license",
      "licenseUserHintText": "If you have a license, please insert it here. In the next steps you will select the location of your application and the capacity you need",
      "progressUserHintText": "Your infrastructure is being provisioned and your application is being installed.\n\n Once the installation is complete you will be taken to your infrastructure where you can access your application.",
      "prereqUserHintText": `The cluster name will be used for issuing SSH and HTTP/TLS certificates to securely access the cluster.\n\n For this reason it is recommended to use a fully qualified domain name (FQDN) for the cluster name, e.g. prod.example.com`,
      "provisionUserHintText": "Drag the slider to estimate the number of resources needed for that performance level. You can also add / remove resources after the installation. \n\n Once you click \"Start Installation\" the resources will be provisioned on your infrastructure.",
      "iamPermissionsHelpLink": "https://gravitational.com/gravity/docs/overview/",
      "providers": [
        "aws",
        "onprem"
      ],
      "providerSettings": {
        "aws": {
          "useExisting": false
        }
      }
    },
    "eulaAccepted": true,
    "app": {
      "id": "gravitational.io/mattermost/2.2.0",
      "packageId": "gravitational.io/mattermost:2.2.0",
      "name": "mattermost",
      "displayName": "mattermost",
      "version": "2.2.0",
      "repository": "gravitational.io",
      "installUrl": "/web/installer/new/gravitational.io/mattermost/2.2.0",
      "kind": "Bundle",
      "standaloneInstallerUrl": "/portalapi/v1/apps/gravitational.io/mattermost/2.2.0/installer",
      "size": "396.37 MB",
      "created": "2019-05-13T20:25:43.267Z",
      "createdText": "13/05/2019 16:25:43",
      "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPEAAADwCAMAAADmSXKeAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAC/VBMVEUAAAAkkv8ad/ccdvEadvIZd/Iad/IZdfAYdvEadvEZdvEZdfIYdvAZd/EZdvEbdvMggP8bevQZdvEYdfAZdvEYdvAZdvEZdvAYdfAzmf+AgP8cdfEZdvMYdfEZdvAZdfEYdfEZdvEcgPFVqv8YePEZdvEYdfAbefL///8cevQZdvEYdvEYdvAYdfEcePMagP8bd/AYdvEZdfEadfIadvIYdvEYd/EZdfEYdfAZdvAdevMZdfIZdfEZdvAui/8ad/IZdfAce/YggP8YdvIYdfAZdvAadfUZdvMadfEYdvEYd/EYdvEYdvEeePAed/MadvIZdvEbdvYgePcYd/AYdfEZd/EggPQYdfEadfIZdvIZdfEYdvFAgP8ZdfAjgPMZdvAYdfAZdvAZdfAYdfAZdvErgP8Zd/EZd/IZdfAYdfEZdfAddvUZdfAZdvEZdvEcePEZe/cZdvEadvIYdvEbd/EZdfEad/EdfPAZdvEad/AZdvAffPcZd/AZdvEadvIYdvEZd/IkgP8YdvEYdfAad/IYdfAYdvEYdvAbdfIYdvAZdvAYdvMrgP8ZdfEad/EZdvEbefIZdvAYdvEYdvAYefMbd/QadvAYdfEYdfEYdvEaefIZdvAae/YadvAYdvEZdvAcefEYdvEYdvAZd/MYdfEYdvAadvAZdvAndv8YdfAadvEZePIadfEad/IZdvAad/IZdvEadvIZePAbdvEZdvAZdfAad/EbdvQZdfEbePIZdvEYdvEZdvEZdvAZdvEadvEYdfEZdvAaePUaePAcjv8ZdvEZdfIaefIYd/AZdfEhevQYdvEZdvEadvEYdfEad/EYdvAfevUZdvEadvEZd/EZdvAbePMaePAid/8ZePEeePAZdvAZdfAYd/IZdvEZdvAZdfEYdfEYdvAad/EZdfEagPIbefIadvEZdfAadfAadfAYdfEZdfEZdfEcd/QYdvEZdvAYdvAZdvAZd/EZdfEYdvIZdvEZdfEYdfEYefMZdvEZdfEZePMYdfD///+ciaTQAAAA/XRSTlMABx42TmV2en2AhIeKjpFBCDBdiaa+1u6/BQIlUn6r1/zaEgM1uPQmAS5wsfD6QApWqetiUKdJofGvLJjtzQtP5BsQc971MimW/V6okyIrdeocIJ2SgxiUZIb4yQTvFuPTNM+92QyQheL+4Bqs+VskH+xh20ujayPYeOEhZ/cn+3IO5ao6VbPzTPLBVAawWLoTzMfdFS93sufoO5kdjNTON3/fPtyIRWYN0WxRWU2tPMJjMzia9m1DpWCPtJfAxaDIezFGCcM9KGnVF+aNlUpanhmkblzQQkQPSBGbrnTLaLmfvIHKFDmCu1eLxnzELWp50pxHt1+ib+kqtnFTiMlM4AAAECFJREFUeNrdnXtYVcUWwOeYEoolmi9AUcEETETNBxqZCWqoEVr55KGSD1BE0C6mAgmSoqQopPjCV1aWaWqahqaZmu8rRgmUVqY9rDRvaXi78333ExB57D2Pteacsw/rX2bWmh97n5k1a9asTYglxVTrgdp17B60r1vPof5DDzcgNVccGzZ6pHGTps1oRWnuVCNZnV1atHRt1ZpWlzZuNY/Wva3do+2ojjTzqGG0nl7tH+tA9cW7Y43C9enUuQtly+M1CNfUtVs7ypNHagyuU/cevpQvPZ1rCG+vJ/yoiDzZu2asQ081oWLS5+mawNvXP0CQl/brXwN4BzzTTpSXBnYV1Tpw0OBnjckb1JNKyHOi/ktnSmnwEAPyDu0RKAP8vKjeF0qav2g43mHDvWV4xbcPI0rbP2q0+WpkPyle8e3DA6NKO4w2FG+If6gcL/VzEVQdFl7WY4yRgMeOk+QV3z64R9zr8pJxeMdPCJQFFt8+TCzvEmAY4NqTpHn9Wooq7x5Z3inKILyTp8jBRo9+YWqMsPZpsfd7TjIGcJyvDO70wTN8pHbXFecHQxCPf1mcNrD5v+Jl9XejBiP2minM+6Q/YJf0SiUVs9iNZ1sgeDQnQRC3i0MiRH/3yksAZ+aKSXrVzLxzB4k+3jhHkAGPKuHAZI6TS2k3s4YX+k8X+/WmzIP+R1tVURXLbt/7rlsWYz7gVKE3OjIlCGrA87WqyuZzOtz9DYQuMBewf6QIr2svuIV61R1TTo+0Ept1Pc0Sxxos8oAXNkSYWKShkMOSXNrKNV09sM/rArzhi1HrnlboyMTuc2+pXKJ8/gobzecdVc8HYyJDMzY4l91p6b12yxQf3Hlk8oGX4c7OQiI0tWaxezUvbzhmskrgN2L5D3i5O87Gw9p6OaG9FfdbBsSrAw7qwvc4eiFtPK6jmIPRuELTbC9VwIkrucD1Q5A2VkXraB7A7re6YtvQB9QAxyTzeH1bYG2s0f2ncla7tZU9tAEqgGdzox056ON+n3W6yteze26osjzWwgOv2cgDxrvynin62jdx/MAqzWdmoeM7b/KAN+M9vJYM9W+xu75dtf3Sd5Dxji28bdK7+NfoPZa/ztklbK3WIcKEet14rmVCCzywF/NckmPg/eo9tmEcg5Ec4LTteOCsKKaJqezeHTW6PAMfzFQO8PxVeGCnD9g2drC77wT00ZddoziH/ZsULH4fcv6rnHkiUdPj3Qlcl7LZY9mtIpN0D/KAfbJmp6gMxV5BaXTiLQXAHyXxiO3ZCt7R7rUEkj61lzOUfQqA4/nZUCM5kZlIUDfIrFVPRSy4KX/X/TFHR7hOuK2r7GBqdeC4lgpiac65AoGk/Rwl63Xiq76Szr7zAfY4PjEpeMSbRUKFB3laOum814fkHJHl7GEEq4iwdBKK9nfm6vlUp6edzGAOR7Nj0p+piCSJJc2s4GvqoROHktgsH+HMKBMVAGdsFAKmS/iqTOPQ7zUnFn/UHQ+sE7nUMCagzCUNlx5IjrHH0EFF5uAE0TPopSLaturs7D4XG4w7J2upjgLggcKn7jkY73yZ2Nt4nJNnqGAlbpsgTJwpNvOc0O7tL9LZje357VZwWnsyXDyT5JSYyvXa2WW+ImGvZ9gjsMMDOx2VyBRqJqj0tHb3M/yeDVuzf1YK5uknZHKjEkS3etohyCT+oswJSZzFA78tl/0mOm000PY2c3n9/s02H4EHXhUtRyycQXNOu/9H7F6OfdjuJf5Sx9PZkumcfUU152nHRMexgwPvsq2fRwObRksC0zBh3fbaCuKYs+gspvGkoWjig9Ipu+Ie3hHtRS+Zlbmww9yP+AtpYCpxAShfOhzqzklQewML3CBJnlhiz+f5paaGAHfoRI2+lzKtizyw1L85VVuFbgaSZw7b9ldIYJ9xAGDaViZYpZ0XvE73jI+T6oF9xN0gwFTqpEdnT3ZBp/lStum3kcB2IGC5NyskQCaQ8hHn0KUAB1wYCCMulLKi41Ac1mzcmG15Lw44phkMmNaWC/prO16NtdoWcU4SL6CAx+cAgekiOUNfayppnSfvYM5CXf33/AYKzDsyryo7tbVc1GjKOUrEVXdoCQZmu8UacklTi8b9x8Mcw6hLJ7Uj4cRzJG3V0VbTXzZGnYYpO1QrFA5M90gac9O+ED2h2i6OM5W+jvkRRyCANX+BTHlU+6is6iNbzLH7LYI4DgNMH5Q1t0NslVvCsYvYGfftgiKuK2vPTXuDtk2o1f10R8QjPo0CBuQ3fKepJ7rytYJGHLMT4MDDduOIT6sKOwys1Ih3n7jQao+YDpa2GKSTyFEphMkr2ZIBBg7rhyReLW9TO1zqV9FrnMGxmm0Vb6tUvpe3qZOYtatCk9Ucq5fha3EAlrixvFGd9emHCk0yzTZxfYUFplPkjcZra7pSwQvkWR0BJj6PJl4BsKqdjBZ4tbzBPp7VH8FHELvRxJAI6gHexrMHz+pcKHFHNDBtDjD7EO+EgXdkPwv8Uv+EJ/4EYLYRh+NZntGfwcRH8cSXAGZ76ei690P+hWd0EBS4tzeeeAtk+ohku47XeEb3Q4l34YFhmxidi4eflv25Oc+oA5Q4VQExqHrTr9q6epa5RdwqPeD8nlcVEPeBGNaJvZfVzEnkGgVn6T2kgBjk0zswEw4Wc42mQoldFRBvhBjWyzvsXvLXDVyjF6y4ONEvIYb1nuJvIudNlNKdUOLfFRB/BzF8lrnOPsk1Cs5p+kAB8fMQw6t0lC0r+Wua2kNrfozNzNHbu3JdR1lJXutkvlHw7bUeCojfB2Wc6CiLTOdnzMsf4VaQzQqIQcWuw/S0xYt41YxcGWD4RUZWggznsXIs2qs/0CyXAXjiXJDhISyU+nyrN8BxPT808R6i8ndccqYjUAvyIpSYvIYmhlUp193ynyOECBx1/gQm/gMLfAJm14MV3LjJN/symHgVlhiYjLFTT98hQojAbbpl8AB9GyTxdZjdQj19Nwkh/NJbNBh+CNMeB9wcaFb3rPRNQojItQVw9JYUtEMRQwus6IYiThHiJGL4MPwhr8YAz4LeNdKLCFBfQtxELC+CEwe1RhD7Q60+r6cxieGPVZRXEEkR1+DAbcBVMPWLAjiJEf8HQewDP0+FX2XXv2JUIEZ8E0FM/rTgOWqZzNVXmidGHFmEQf4eBtxuDdjiWDQxbFtefiYCC/4gkuYY5VsE32p6DUNMiloBgHsgDDLqioWIrU7Yz7MMzZYGHn0EYU//a2LehKQL2U9C1kscIDth52AK97rrO3odBL1M7J0BQsKWSQG/hCoqw8gVTxbbSaC2yGXi2Fnmlb6KsnVDX/N0QkiU0BjGYYmJ55w0UeBvfHCmzrPP38eIjSIRjUzW/CVkyRv9iQjGtfFfxaI+FJLmrLlOChT+HjcWa6U/Q/sS8RwzNZ+WChnB+RE18w9BG2Glgp6T2Nso+i5kej6j2FnsiwUKTFxiUGyQyFyoT1SJy0TNucP79feUfCMhj3XV6JZQikBZDoXKr1QMqbM3p+JFhcATt49fVaS7Dovi7rWtTaJrxnaiVkyHU+f8cW3/Wvu/921X+TUI5r5ltthpaqk0JjYhzLOuwJJbT/MFiZOm2QQxM78ovKTJOtGH/LAtAJuYXnNpDTvRj1TRdm42QMyud1GabyyeEfybDRCzS5uW1g3eKkxc7Gh4YA82QWnybaIwMbpchPmF40GWrvmewrs42ibE4MBF7JvO9zIeF4o/5L8NTuzAHn5KWbOPxYlDrxoaeBjnyuC9tOl8iXjMfkMTD+eM/l7l/GcliFu/YWDgoZwoZWT5ObhEwU56wMDEvKTI+1cuJD52izpLNrPc4VUOul3eVCqZMOqIUYl78oZ+/5Z5jFT0fLBBgbvyBh5YoQiu3EfJzxoSOIP7NblDFVpLVaKlxSeNSLyXO+6Knx+ZIUVM/2uL73TlaKyjZHmDLwwH7MY/rz1VKTT5mBxxwnXbe6fp15U6jJA83h1zxObeaVr5SzFZssVKp3gaCdhFoIhf9PjKff6SJKZrDQRc0Aow3ebLEsOvEigXd6HHtbVKr/HSxWhaLzAKsVDloLRqM498idZ2/Y0BvE9otNUvA86QJqanahkBeJ5Y6k71yojOs+SRm+YZIFxbLLbj01hbPgXk1U23+lNOPCU20pZaUTFIJYtJLtYFHiCYDBitufkBXYHP7mVN4DsrBYepXUEfVljKb6z1gHsVi45S50vZoKLp1He7tYCvB4uO8YqOhsUgYtqvk3WAV4nX4Wyk561BbzSstcZxVB3x78ts1B3fDeiNhgNhluZ1OqMkG/9IMBS5zy7LAmctlBkc4wOgF6HENPq4JYEPSzmIrAPRI8lgZNrjHYsB50tt9IqZ8Zpv4cQ03ELbx5OSNe3bsyeETAQyHWSJQHa+ZG2CTE6yZz6GmDaLMzfv5BWyY+J5C85LUcj0crx5d//SFe0PcXX+GIlD3t3SfDNYw5/lx3OMr/Y2RUrs8t5m4Y3pBngYrgKK89KwyLT4H/Wpbnn7kyATyzAR3XYUL8nvpivlLXKAFdC9JeayrlOATCft6auMd+hm4Cc4/hI0EDRKBTLdffuYClzns7nAL0PRNOEwnD9VJDMvZiF5r9ohipyLH5s4L1SFTKNTPoN/TddxwcuY122hxGng0DSqTkJT4iBx7ax9PXGfKdgtFWfdQZVK5LiRx6TiJB7PHQ3EGn1O7j/8GlUtoVOWF4o866zu9iuyFdi7IvlrOtmFmkO6XD59q6HeUl1wp9DONUqRpfl3ZH9G/6Nmk8DgEwdSzmy4sejCW4ULnmqRunjq8XoHL7ear/R3BKiBdI7asrwImCtNn9gwcC7oy4FZG20W+CXgpd5eaTYK7Ps51Oc5G2iTwJG14V5te5skbolx5FfbIHBPVHKdU4TNAa9DxtmK2tgY8JYM5P6UxCTbFHAOdkN+FznchoBbKTkVmR1lM8BtFCWYTQuwEeDMIapiiUOm2wTwRoX5dJNn2gDwpNkqI+TDThgfWPEZX9hNgwNfUZ4Vm/GroYE7m+GqSvrXBgb+wTwXVY57G5Q3Yau5Tqy3rzQk8Mr15ktKGHLJgMBfmjWt3fGg4YAfG2/mZJsvkgzFG73cmZhbGhQbCHiLlyVy5jL2GoU3cHM6sYws6GMI4DfnWS73teBDAwA/0ZtYUr7KtDJvciGxsPh8bNXw/XlrVMDb1dR6U/QmYhUx/eFrFV6/G+7EWpI12PKbC+/hGcSa4rLNwkvw7dnE2rI+14LA3wQRI8jhbZGWeb5TdhKjSNBe8+8vRn3oQowkT9cLNitvrMMwYjQxDTRfuOD3fBMxpLQdHmsG3A5nrhPjitNT26KV4iZMaWEiBhe3EbkJqpyNJXEFxCak9/9u4z+KG3s7dS6xIQmZ91sE/FGPWvjDKmdie2Lq+NNl+SsdaU3qdnQkNizxv1xrLrpU+zW5ttXDk9QEKdo1cKLroUl6Gy3v8CspE2/9mEFqnHhmef35y4j29vXP7L8rZ+rb/zNi8Z9eWRZ9rP8HU96gESO/lyAAAAAASUVORK5CYII=",
      "config": {},
      "providers": [
        {
          "name": "aws"
        },
        {
          "name": "azure"
        },
        {
          "name": "generic"
        }
      ],
      "eula": null,
      "nodeProfiles": [
        {
          "ram": "2.0GB",
          "name": "node",
          "cpuCount": 1,
          "description": "Simple Mattermost Server",
          "requirementsText": "RAM: 2.0GB, CPU: Core x 1"
        }
      ]
    },
    "operation": {
      "id": "760787a9-b100-4e69-85e4-50818e86ed6f",
      "siteId": "aws-test",
      "created": "2019-05-15T03:03:41.936Z",
      "updated": "2019-05-15T03:03:41.936Z",
      "state": "install_initiated",
      "type": "operation_install",
      "provisioner": "aws_terraform",
      "installExpand": {
        "profiles": {
          "node": {
            "description": "Simple Mattermost Server",
            "labels": {
              "gravitational.io/k8s-role": "",
              "role": "node"
            },
            "service_role": "",
            "request": {
              "instance_type": "",
              "count": 0
            }
          }
        },
        "servers": null,
        "agents": {
          "node": {
            "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/ee9bcd7b8b817d83a6d778fd5749152a7bdc0ffa2029116745623fb561678a02/node\" | sudo bash\n",
            "agent_url": "agent://v6.gravitational.io:32009/node?access_token=ee9bcd7b8b817d83a6d778fd5749152a7bdc0ffa2029116745623fb561678a02&provisioner=aws_terraform",
            "token": "ee9bcd7b8b817d83a6d778fd5749152a7bdc0ffa2029116745623fb561678a02"
          }
        },
        "subnets": {
          "overlay": "10.0.0.0/16",
          "service": "10.2.0.0/16"
        },
        "vars": {
          "system": {
            "cluster_name": "aws-test",
            "ops_url": "https://v6.gravitational.io:32009/t",
            "devmode": false,
            "token": "ee9bcd7b8b817d83a6d778fd5749152a7bdc0ffa2029116745623fb561678a02",
            "teleport_proxy_address": "",
            "docker": {}
          },
          "onprem": {
            "pod_cidr": "",
            "service_cidr": "",
            "vxlan_port": 0
          },
          "aws": {
            "ami": "ami-69045e0c",
            "region": "us-east-2",
            "access_key": "",
            "secret_key": "",
            "session_token": "",
            "vpc_id": "vpc-59d73e30",
            "vpc_cidr": "10.1.0.0/16",
            "subnet_id": "",
            "subnet_cidr": "172.31.54.0/24",
            "igw_id": "igw-5310ff3a",
            "key_pair": "lele"
          }
        },
        "package": {
          "repository": "gravitational.io",
          "name": "mattermost",
          "version": "2.2.0"
        }
      },
      "details": {
        "profiles": {
          "node": {
            "description": "Simple Mattermost Server",
            "labels": {
              "gravitational.io/k8s-role": "",
              "role": "node"
            },
            "service_role": "",
            "request": {
              "instance_type": "",
              "count": 0
            }
          }
        },
        "servers": null,
        "agents": {
          "node": {
            "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/ee9bcd7b8b817d83a6d778fd5749152a7bdc0ffa2029116745623fb561678a02/node\" | sudo bash\n",
            "agent_url": "agent://v6.gravitational.io:32009/node?access_token=ee9bcd7b8b817d83a6d778fd5749152a7bdc0ffa2029116745623fb561678a02&provisioner=aws_terraform",
            "token": "ee9bcd7b8b817d83a6d778fd5749152a7bdc0ffa2029116745623fb561678a02"
          }
        },
        "subnets": {
          "overlay": "10.0.0.0/16",
          "service": "10.2.0.0/16"
        },
        "vars": {
          "system": {
            "cluster_name": "aws-test",
            "ops_url": "https://v6.gravitational.io:32009/t",
            "devmode": false,
            "token": "ee9bcd7b8b817d83a6d778fd5749152a7bdc0ffa2029116745623fb561678a02",
            "teleport_proxy_address": "",
            "docker": {}
          },
          "onprem": {
            "pod_cidr": "",
            "service_cidr": "",
            "vxlan_port": 0
          },
          "aws": {
            "ami": "ami-69045e0c",
            "region": "us-east-2",
            "access_key": "",
            "secret_key": "",
            "session_token": "",
            "vpc_id": "vpc-59d73e30",
            "vpc_cidr": "10.1.0.0/16",
            "subnet_id": "",
            "subnet_cidr": "172.31.54.0/24",
            "igw_id": "igw-5310ff3a",
            "key_pair": "lele"
          }
        },
        "package": {
          "repository": "gravitational.io",
          "name": "mattermost",
          "version": "2.2.0"
        }
      }
    },
    "tags": {},
    "selectedProvider": "onprem",
    "clusterName": "",
    "onprem": {
      "serviceSubnet": "10.100.0.0/16",
      "podSubnet": "10.244.0.0/16"
    },
    "aws": {
      "authorized": false,
      "regions": [],
      "useExisting": false,
      "accessKey": "",
      "secretKey": "",
      "sessionToken": "",
      "selectedRegion": "",
      "selectedVpc": "",
      "selectedKeyPair": ""
    },
    "flavors": {
      "options": [
        {
          "name": "single",
          "isDefault": false,
          "title": "One node",
          "profiles": [
            {
              "description": "Basic node",
              "requirementsText": "RAM: 2.0GB, CPU: Core x 1",
              "name": "node",
              "instanceTypes": [
                "m4.xlarge"
              ],
              "instanceTypeFixed": "m4.xlarge",
              "count": 1
            }
          ]
        },
        {
          "name": "double",
          "isDefault": false,
          "value": "double",
          "label": "Two-node cluster",
          "profiles": [
            {
              "name": "node",
              "description": "Basic node",
              "requirementsText": "RAM: 2.0GB, CPU: Core x 1",
              "instanceTypes": [
                "m4.xlarge",
                "m4.xsmall"
              ],
              "instanceTypeFixed": null,
              "count": 2
            }
          ]
        },
        {
          "name": "triple",
          "isDefault": false,
          "title": "Three-node cluster",
          "profiles": [
            {
              "name": "node",
              "description": "Huge node",
              "requirementsText": "RAM: 16.0GB, CPU: Core x 3",
              "instanceTypes": [
                "m4.xlarge",
                "m2.xlarge"
              ],
              "instanceTypeFixed": null,
              "count": 3
            },
            {
              "name": "gigantic-node",
              "description": "Gigantic node",
              "requirementsText": "RAM: 16.0GB, CPU: Core x 3",
              "instanceTypes": [
                "m4.xlarge",
                "m2.xlarge"
              ],
              "instanceTypeFixed": null,
              "count": 2
            }
          ]
        }
      ],
      "prompt": "How many nodes do you want?"
    }
  }



const stateCapacityOnPrem =
  {
    "step": "provision",
    "stepOptions": [
      {
        "value": "license",
        "title": "License"
      },
      {
        "value": "new_app",
        "title": "Provider"
      },
      {
        "value": "provision",
        "title": "Capacity"
      },
      {
        "value": "progress",
        "title": "Installation"
      }
    ],
    "license": null,
    "status": "ready",
    "config": {
      "enableTags": true,
      "eulaAgreeText": "I Agree To The Terms",
      "eulaHeaderText": "Welcome to the {0} Installer",
      "eulaContentLabelText": "License Agreement",
      "licenseHeaderText": "Enter your license",
      "licenseOptionTrialText": "Trial without license",
      "licenseOptionText": "With a license",
      "licenseUserHintText": "If you have a license, please insert it here. In the next steps you will select the location of your application and the capacity you need",
      "progressUserHintText": "Your infrastructure is being provisioned and your application is being installed.\n\n Once the installation is complete you will be taken to your infrastructure where you can access your application.",
      "prereqUserHintText": `The cluster name will be used for issuing SSH and HTTP/TLS certificates to securely access the cluster.\n\n For this reason it is recommended to use a fully qualified domain name (FQDN) for the cluster name, e.g. prod.example.com`,
      "provisionUserHintText": "Drag the slider to estimate the number of resources needed for that performance level. You can also add / remove resources after the installation. \n\n Once you click \"Start Installation\" the resources will be provisioned on your infrastructure.",
      "iamPermissionsHelpLink": "https://gravitational.com/gravity/docs/overview/",
      "providers": [
        "aws",
        "onprem"
      ],
      "providerSettings": {
        "aws": {
          "useExisting": false
        }
      }
    },
    "eulaAccepted": true,
    "app": {
      "id": "gravitational.io/everything/1.0.0",
      "packageId": "gravitational.io/everything:1.0.0",
      "name": "everything",
      "displayName": "everything",
      "version": "1.0.0",
      "repository": "gravitational.io",
      "installUrl": "/web/installer/new/gravitational.io/everything/1.0.0",
      "kind": "Cluster",
      "standaloneInstallerUrl": "/portalapi/v1/apps/gravitational.io/everything/1.0.0/installer",
      "size": "5.06 MB",
      "created": "2019-05-13T23:29:35.365Z",
      "createdText": "13/05/2019 19:29:35",
      "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAYAAACAvzbMAABcDklEQVR4nOzdB5xcZbn48d/znpktaSSElhB6B+moQHY21IAFFSvXiqKogEB2NugFFSsiaYD3z/XqtV2vXhUrFpLd0HYTwK6IoiAiRYrUkLLZnTnv8/+cMydISSC7O3POlOd7mbsrye552D1znrc+bw5jGlVROaV0Bf/o2D1HKJ0KnQKdqE5B2ApkK4g+snXycRow5VmvDiCfvNqSjxsoUEo+emA9MJS81j3t41rgyee8lFUIj8av6PPK1w+jDDv1Q9658uCiuRn+AI0ZH8k6AGM25fALruLmT72KQu+yvCATFCaK6mQV2Q7YHpgBbPO0BLHhNflpyWDDK0gp7CjZlIEw+VhKXlGyWZW8HgceAf4JPFR5yUOg0ccnBF3jPWuPOXJuefnK67nx0qNSCt2Y0bEEYjI3++zrGF7bSefU1e2gU4HpwM7ATsCOSbKYCWyXJIvOJEG0NcE97JMEMxL3TuBh4P7kdR9wD/B3hHsVHhf0yeFSsLYtF+qKRSdkHbtpcY3+5jMNqLunH1ER7/xUlB0Q9gEOAPZMEscOSS+iPcWeQ70qJ8llLfDA05LKHcCfEG7XKNko61fYcJhJmSUQk5qu4rIoG+Q9chjwKuAIiJPH1GSYye7HzbdhTuZB4BfA9xCWoay2eRWTFnvDmlQUin0kk9ZF4H3JUJTdf9UT9VCuRPgIqvcN2vCWSYG9gU3Ndc2PGsZ0OC8fTRJIW9YxNSkFviEqZ4GuGlhsPRFTWy7rAEwL8ILzcjJwpiWPmooahG9Q0X9TD8dcPJh1PKbJWQIxNdXd04fTeOjq1GQIy9RWO/AuAmaWHh7KOhbT5CyBmJpSEVTYFdg/61hayAFAIesgTPOzBGJqTKP/96Jkw59JR9QLObFcdsHh5yzPOhbTxCyBmJp69G8++vBi28+Ruhfncn5WPuezjsM0MUsgpmYK85YyfReZZMNXmdgV2Dv6pLu3L+tYTJOyBGJqxwlIXIpkl6xDaUGdUS/Ee3uLm9qxu8vURHdPX7KqVHZP6liZ9L04n/P5XGDbvUxtWAIxNaES3Vzxg+sQ2/uRmV29Z7tyWbOOwzQpSyCmJspeKavPAwdnHUsLm6WwU5Q+us/4adaxmCZkCcTURBAI4uJzO3bNOpYWNhXYWxB8p50dZ6rPEoipuld87HpEiV47Ra3grONpcQdrLhSxaRBTA5ZATNWtXjOCVobd90pawSY7+1F2E+NJKWOqzBKIqbooeTgXt3lt/iN7O6DMwubRTQ1YAjFVp6qo+glJCROTre3ivTiiHH3eDVnHYpqMJRBTdZUBd9khOZrWZCtK5HsJQikczjoW02QsgZiqOqJ4zYZTynYBZmQdj4kdoKhtJzRVZwnEVFWOcMN87X5JOQ2Tvb2dyARnGcRUmSUQU1UqIajmbAK9rsxUZXu1iXRTZZZATFVJnDvc1GQJr6kP2ynsrChzPn5t1rGYJmIJxNTCzlZAsa5MAPZUH6BrSlnHYpqIJRBTNUf3LEXjDQe6m51AWHf2F/GBepsIMdVjCcRUTVkCcrk2Sc7kthMI68s+Dp3gbCLEVJElEFM1Tj2+NNIGHJR1LOY5ZnqRWd6KYpkqsgRiqsYjqLCtVeCtS9smc1PMvrA/61hMk7AEYqqn0rjdNS6fYepNZUe698jarEMxzcISiKmKo3r68RKPr+9pFXjr1v4qQU5sHsRUiSUQUxWhKE4lsAKKdW0f8BOwBGKqxBKIqQpVh6q0WwKpazNxMguraWKqxBKIqQqpTKHPsAq8dW1rlF1R4aUf+ULWsZgmYAclm+r41wS6bSCsX/GOdFElv27nrGMxTcB6IGbcuotLN2SQPYApWcdjntf+KpK3QSxTDZZAzLhpfBt5m0BvDPsIfoLYGbemCiyBmHETUUTisz/2yzoW84JmqDBLrQtiqsASiBk3VYleNoHeGLZCZTfU+iBm/CyBmPGLC/CyW/xwMvUu3pHuRZjTsyzrWEyDswRixqW7ZzkqChJPoE/OOh6zWfYTpc0KK5rxsgRixkXFI0jO5j8ayr4iNpFuxs8SiKmGTluB1VC2Q2X7DZt3jBkrSyCmGmYCs7IOwmy2LSGeszJmXCyBmGrYHZiedRBms02sbPoMKBSvzjoW08AsgZgxK8zvAx9/uicwKet4zKjsA2HeTh4242EJxIydxtXU8jaB3pD2FWWC2Dy6GQdLIGbMVDV6dVZas6bBbK/CdrYj3YyHJRAzDgIq20UPo6wjMaM2LZm7MmbMLIGYMZPKa9fkYWQay2RgD8XTXbw261hMg7IEYsbk8A/9DKmMf+xqJdwb1t7icznVMOs4TIOyBGLGJF8O0CAMkhVYpjHto0E4QZ3NpJuxsQRixkYF9c4m0BvbTqJsLWoJxIyNJRAzRgqik6OHUNaRmDGbCrK7lTQxY2UJxIyRIJUVWFtkHYkZsy1A9hBRXnL2QNaxmAZkCcSMxw62A73R6V5IELS3DWcdiGlAlkDMqBx37lKO7O0HZVvgZEsgDW8/9ToNVQrF67KOxTQYG/w0m+XA+T9gl9IMHgmenCpwAvB+YHZczMQ0snXAtcB3QPqGhocfas/nWbnkhKzjMg3AEoh5XnPmLY0+OBW3kwrHA28EDk8quprmMQzcAvwQ5Wfi9Y/qpDS4eG7WcZk6ZgnEPEfh7D7cBAjLOlFUDgFeCZyU7Pmw8q3NTYH7gajl8D1Ubsy166ryEAxeasnEPJMlEPOUOcXlTNJOVsvabRSOAd4EdCcHEJnWswZYCXwLZHkZ9w+H6spFx2Udl6kTlkAMhWJfdCOIIjuCvhx4M/BioD3r2ExdGAH+CHxH4YcjjNyec4G/ccHLso7LZKzhEsiRxavxKHlyeVRzTqTsKJUUx/WL7IYejTnzl0Z3gPOh7AbyOuDfgH1tYtxsggfujCfcle8GcKuEYbnc2cHgxUdnHVvDeNOir3LnnbvR0bE+ELQNUR96RkTQlYsba/FCwySQ2ecuR8tOXHt512QV0EuArYF/Ar8Bfisqt4nzT6hIOLDAxms3pdDTF/3qHaK7JZPibwH2smXdZjMpcG88RwJfS3on5cFF9p7blLixFvXy1U1SjcvoHwQcCuycrIS7DeUa0F8CQ4MNkkgaIoF09fYhyGRU3wG8L3nYPb2VHLWMHk9aRzcCPwf9lQj3yt93HvbHLWfwfWdm+F9QHwq9y0HESRjurhInjTclZ0LYxLgZiw2J5EqQ//XorQLlFZZIYoVif/RoyoFEDd2Dk0ZvV9LL33ojPf1Hge8DC8UHt2uuxOCCEzOKfvPUfQIpFPtQlW1E9KPAu4DOzfiyYeA+IMrmg6A3KvrXPLpWQVttqGvOvOWIOgmD8izgFOCd1uMwVRQlknuAb1Z6JP4OUfEDDdKKrqajin2UoV2UmXHCEArJfqndR7Hp9iZgHqXhn9PeyeCC+l20UNcJJO55KDOABUlreSxj8yHwMPA74HpgQNG/IDyhon5lnWf48ejuXUaufYjy+gnbKrwOOA040HocpkY8cDvwZYFvhSr3OlGaeWiru9jHhA5YN8TEeBGK6BFRHgGij1GDrWOM3/oW4KxSuTzY3tbGDXWaROo2gXQV+6IPWwksTsboq9Fajm7wJ4A/A9dVduDqHwL8Y6qENyxujp7Jsf/+E0bWt+NEJ3nh5dGNCLwUaMs6NtMSyskD8D8Fvh/mco/lRka4YUlzNNa6evsJJSDQ8mRRdkuWukdP+EOSoalqvc/+gMjpIv7mkTUTuPk/C1X6ttVTlwkkHrZCJgl6UVIyoxargqJu9+okmQxGyUSV33rlnwLhyiWN2WqKem3RDSwat4DOBF5m9apMRtYnDbXLQa8HWd+ovZHuYj+OgJDyFsDeSS/jqGRuY3oNVy7+HHg3wq2DC+vvZ1d3CaRQXAqqbUjwQeD8cXQBR0OTlRC3J8nkGpRfq7oHRTQcXHx8CiGMT3dxWdQikrLkd02S7tuAbbKOyxjgscpEO1fguBXF1+PD8NminoaKiKhuIar7UNlce1SygmrLFOcQ+xROB+6utwUKdZVAkl9Y4Lx/N/DZDM+aiJLJX5PJrGsFfonT+1BKAwvrb2Kwu9gHotNU5Q1Jr+NFNkFu6tCdwBfjifb23IM8vJrBL74665ieoavYjyLi8FGv4gDg6GQS/MDKAVyZvK80WaBwjqg+Wk+LE+omgbx03rVs0T7EUCkf3VGfB7bLOqbEcJT5gRXAMuDXwD0CpYGMWwPdPX3RrRXgOFyhFzgxpR6bMWNVTnr5C8VxDZ7hrN9HXT3LUXXiXHmrZIntsUlvI2qITamT52T0c7sMlY8KrBuok1GRevjBxLp7+/DK4QJfTZaY1qORZLniSuBqgV8Eob83zLty2hsXC5VFBtsA7wHOgHjZoNl8PlmhV05e/ll/7pJX8KzP6+Y90+Aei1rVolyamzHlzpG7H2PFf7w8tYu/9AM/Y3i9MmlKfrrA/skkeJQ09gMm1+nveV1lWN//hyDhwKLseyKZ/5C6z+1HAw8quyBx8ujOOqbNFCWTu5KNi30oPxeVe6OHkbraLV3s6u2Pfms5PEcL+qHk52WlR55pffKA2vD6R/J6NFmFtyr5O6V/vTR85reQIEkYz361J6+O5GNnskhhcvJxUjLUsUVS8n5i8mdTrLbYc2iyvP4S8fxQRdfXcgf2S89aAeUcbROe3AqR/UGPS+Y0XlTHSePZ/gl6usv5H93/mx25o3+/TIPJ/AdW6OmP7qOpCJcnE7+NKHoI/S2ZM+mLV054vQfVMoGrWjLpKvYhqlsjckbS62j1SfIwSQj3JwniDuAvyVj7A1HCENXHEIY1V/L8c1tlwXkMblW9k/cO7+lj3QSYtA4JAiQeQI97K9Kh0UNJNU4eAtOV+BTHnZKy+Dsnw7TRa0I9vBcz9CTwf8BiLZVud53tDHy2OvseCsWrwYeCtG2FxHMaG5LGhp5GI/oTcKqq/FKcZzDDedlMb9rCvL4ognYkXm31oSbZp1BKeiZRMomy468FuTOfayutW7+Wmy4bfTe9e/7V0VPJ+TA4Avhw8iZotV5HmPQg7gb+HtcOgj8p3CWi//Dow5TDkmy5lcr99zP4+ZOzjvc5DvloHy43Qv7RThfkdJLDb6eVzWb7JBO2uycJZuZmVlxoJlFv5PfAp0X1qqiHP9bJ4jnx8K6Iqs5QeWoifE4yv9GoSePZrgXeKSL3jIyUufnybPawZZZAjjtzKf3/b1u6iw+/o7JOPO7iN5tyUitoRdwzEX4Ziv9bKbeq1DGyNYOLjnneLz7ynOvI50bw6rZA9FSgCOyQWvTZGkl6FXcmLa7fQLwE9B4NeGzFJYSFXppil3PhvD5kPficTBBhe4iLXB6cvPYAdm2gIZbxWgX8F8il4vWBMHCsXPjCvZG4QKiKw+l2yc/tqGQyfK+kh9eMvqRoT9SDW5HRfEgmN2RXTz+BKL6yPO7rwC5ZxJGycjIBf2OymutmVO7pXB+OjLQ5rn/WaW9HnXc1H331y7jw+317Jr2ONzb5GHrUc3sk6Vn8NimIeYvi7hsa2mNte/u93Lik/nbi1kpXcTniJYcLt0mGvA5PXvsljYhmvhfCpOzQheIk6sn7gQXPXHW08xtvY8/d/sr64c5AxW+NcjDy1ET4Xi3Sg1sPfNShizWeVE+/MZV6AjnsjBuY0DmEetkZJ/8TNR7SjqEOlJJk8mvg6riHotzTKYxEzW6VuD+fV+UV0ZsoWYPebK1PTU68uyPZbTsY9TBUuFsnBU/KkGfFZ+tjqWLWtp+7nr0O7mNkuLNDAt0+GYo5JtmfsFcT906i3vtCkK+osDoIlbI6RDRA2AbRF0ul0sIREJcUacWKCw8Dp4vzP/RhwIqUl/emftMVKqU2pqBcCpzapDf+aIwkb5RfJT2TQZC1oO9PJsqnZx1gFflkVdTvgQHgBpS/BN4/rBDecGlz1EqqtWM+2I84XGnEb6XI08tqRA2NaU32nopa2d8FPo3oKlReAnF9tyOSob2JWQdYB24BfbM6+WN+OOS6FOdDUr3RCsVlCOoUdw5wkW16e44NPZMnk6GKZlhUoMlZLb9O6iItj0vG5POrKJcZXGi9jPHo6umLFyBLjqlSqdG0YZXRIcly4mZIJj7pqY5Y0tikK5MSRo+mOS+Y2s3VVewnR0iIOwH4CsRl2k3zGkkKVUa9qp8o/G7a1LuffPzxnVPvZreKruIyDvzTgfx+n99vISIHJy3145JVXtZYa25R4/PjSFwCqpxWrbFUEsjhZ19Fvq0dVXYX5H+T0uKmOT2WrDr7MUqfV+4Twa9Y3PirpRpJ3DNRdc7JjGSe8ZXJUtaZVietaT0MnFb27sf5ICSNun2pJJC42J/qZBW5NDlV0DSXMDkBcinwbYRfiMragUXW06gH3b1L8V7aRWSfJJG8OhkibYWVSq3mFwJvUeGv2z2+miu/9LqaXqzmCaRQ7MPHC7Tj3dML7KZtKqVk2e2V8VnOKn9FdKQZ9mY0o67ePlTiHXbbiMoxyUFtXRlWvTa18SVUzgFdO1jjnn9NE0h31I0WQdDZCv+blG8wjW8kOXHu68APXeju9YFXSxyN4cizr+PGy4+iUOyfnCwFjhLJ3OQ0vWaYdG9164Ce9nDkCyMur7Us/17Tm6VSMVZngHwNsPGMxjeSbPL7H+BHuVz5/jAMtB7PSDGbp7tS1blD4dCkFt2rkvpclkga2x0K/+bQXz85PJHf/UdXTS5Ss5skOdM8J/CxpM5VUKtrmZorJVVTv4zqD8m5BwlrV3HYpC95v7ZJpQzIO4DX2ErJhvddgdMVHq/Ve7UmCaQwrw/NgXhOih86sFUtrmNqzid1qP5bVa7M5SffH5bWMLi4OpVSTf0pFPujD3lFDxF4N3Byk21mbSUjwPmlML8k58q+Fsvna7Ocz8Xbx3YG/t2SR8O6O979i5wc5rmcQO+//rOHW/JocoOLjmdkJF/KO/25g7OAU4AfAGuzjs2MWhtwVj4ovSTuKej+Vb9A1XsghcqZFW0qcjFwro2lNpxH4xVV8J9hKbhFRMOVl1nSaEWFeUtxuQD1frIiL0vO2z8i6qFkHZsZlR8pnCY12KVe1Yd79/yl+HKAiL4GiYeuplXz+5uaGorPLxE+FzVEnTA84uEmm+doeYX5y3Elh+bKW6vGE+3vT84uMY2hFA9ljeQXBbmyrlxSvaGsqh5KpN4hTncEzrPk0TAU+EN8JovTK3NleXJ9R8hNn8nmgBpTfwYXVHqgR/Zc97AKS/KUrtHK6MJrm/Qcn2YT9RjPzLeVBoBfVPMbV60H0t27LOp55L13nwTmW7mEhvAY8E2Fy97x2PF/vWybK7n1s2/MOiZTx7o/tByirqmjUzVeJPMh4CAbqm4I3xH03YqsrtZQVtV+6fGeD+FYlG9QOfvZ1K9ycrDVJd7T73J+ZHCBlVI3m+/Yj17L0BNlcnn2UPg48HqbG6l7Q1FPpByWv9Keb+f6BceO+xtWJYEUisui7zQdla9TOeDF1K+HkiNDP68iD6zYjONCjdmUqOGoqtNE5OPJ+TW236u+/R7hDaLcUY0TDMc9zNQ1v5+1L9oBVN6anEFs6lMYH+AEb3OinxTxljzMuA0umotz8jjwmWqPr5uaOADlDO/CfKF36bi/2bgn0cUrk279x/5aaX00wwFIzegR4AvA/xOfu/+m1x/DyOysQzLNQu7dGt3lgQco5W5Llvma+iXAW8S7n4IsH+83G1cPpGteP967DkXPSA7+N/XnV8BpLucvxHH/wBJLHqa6/MyHYTg3Bdgh61jMZtkaZB7oloWeZeP6RuNKIOIU5/zRgC3dqT9DwDdA31oqu6vwlAcX2J4OU11HzftpXHEbFxdLtYPiGsexIG9qCydy+HlXjfmbjHkIq1IzR6cnu823HHMEphYegvhoyy+DrLrZdpKbGgmlDRHdBfig7QlpKO3AGSO5dcvzYfsdY/0mY+qBzJ6/FNH40zckB/ib+nEL8G5Vd3mUPKxirqmV7nnLEPXtSSPysKzjMaP2IuB0kVyu0Du26ZAxJRDnHVppdbzXJs7rRpTSl4O+8549Jvwk0DActCNlTY3M/cBPCAOHOjkpOUfENhI2pjd7DV+K+jF98agTyBHFnzGk66Ob5VTgwDFd1VRbCHwT0dOcut/MunMNNyyxQ55M7axvz+O87gV82MoWNbSZAmeqMrGrp2/UXzzqBJLTHJ3ScVBy6Iy1OrI3BFyG6rnq5Z52GWGl7So3NVQo9qPeTUbi4xqsEdn4XiHC8TKGp/movqSreE30IS+Elya7Tk22ViWT5ZcDa22+w9RaoXgNZR9Izo28H1gIdGYdk6mKZcCbgcdG8xwZVQ9ENEQkfCnwurFEaKrqUeACJ7rYiSUPU3vd8RBHSN6NvDQpmGrJo3kcBfrq0X7RZieQrvnL0EA7UN5jxRIz9yDK/DDkC+VQhm9YaMnDpEDif7ZW+AjEJ46a5tEO8h5FZ3QVN39z4WYlkK7icsSDeOkCXjmeKM243QecU8qX/oc2X1q5xJKHqb2jissQ8bmkZJHddM3pMEFeK+iGs/Ff0Ob1QKSMik4ATrNNg5m6C/hAqa18pUgQ3niJTZab2pvd24dTwas7ITnWtqoH0Zm6kQfeCcFml6R5wQQyu3cZog7UzQZsbWh2/gactbZj6x8GIxP1posteZjam3t2ZThjRNgV+GiljpJpYgeBvkEJN6sX8oIJJOqzCtopcWay9d4ZuTNKHoM/+v7P8qsfYOWiOVnHY1rE+hwEXidKpVTJS7KOx9RcALxN1O2I6gv+5edNIF09S/FR+kCOsN5HZv4KnHHbb0tXH/fG1/Pzy1+edTymRXT19HH73SVU5C3AW7OOx6Rmf4TX4h2F3uefUH/eBBJqjtBLW3Lz2NxH+uI5j3VupG/fg3Isv8iKIpp0dBeXgyh77Nz20qRQ4oSsYzKpiXohbxXnZ4l//q2Cm0wghbP7CQJP4PRQwJq96bsHOEfWDC2bUA4YWGwdQJMeFY+IbEtlye6uWcdjUnegCicp/nnnQjaZQEbaRihRijLRW2zfR+ruB3rDXPknfnKHDi6xY+ZNemb39BOWXR7lLBu6blm56NmvIttESWRTNppA9pigtGk+eu1r+z5S9zBwnsD3gnJOVyy0969JT3fPUsJ8niDw0fv+/bZkt6UdJsgJ6lxcun9jNppAtn1/P+vCqPPBa4Gdahyk+ZcngAs1dN9SL97Kk5g03aHvQXHkSyN7AhcA07OOyWSqHXizU7+FDzb+FzaaQARlQhDulCQQk451wCWq+iUJwnBwiZ3lYdL1ruIbo0fChiq7h2Ydj6kLR6LShQpzep87F/KcBNK1YeNgZexz35SCbHUl4D+Byx0yMrjIhq1MugrRw6FNBPFvB96UdTymbkwB3ojQFvLcfSHPSSCi8QqMLYDX2/hnKqLfyrdU/EWIrh1YbMNWJl2Fc/sqb/yS77Iqu2YjjhflwOhJtWDZ75/xB89IIIXzro6yR5RGDrddp6m5AeVCUffYoE2YmywEgGdGsmTX5jzNs0X3xsmBE/fjvoee8QfP7IGEATjNJXMfW6QcZCu6A9EP4fSu+FBaY1JWKPZFneA24GzgmKzjMXXrlaHXWc9e0PusISyN/tkz6rKkGVmLegL4+OCCuT93Xhm81IauTLq6evoIgnjE4TXAe5O+iDEbs7fAcY6AruLVT/3LpxJIobgM1ej+keOtG1tzUX/j8wJXFnr7uWGxVdY16RMBH+p+wIetUKp5AXngZPXhJNF/tTOe1gMRRMKpwEmjPerWjNpSEb1URUdsr4fJQqG3L8ogU5R4ye7+WcdjGsIROA7maeWxnpUo5DBb/11ztyN6oXoeko7nL1RmTC0Uzu2HdYFD9V3A67KOxzSM6cAJ5XJZunoqO9PjBBJPpPn48xOAqVlH2cTWAhf/809H/loJGPiU9T5Mut75qi8QL5PpCLuBYvRZ1jGZhnJiLp/bRlyl8VvpgaiglcqbVi+8tr6F6He22edGViy2H7VJ31/32BlRPwvhQmBW1vGYhrM3ypGgHHHOTbgDL/hRPKQlokcAe2QdXRP7PbAQlbW209xkobJkl3aQqOdhx1qasZgIvAyVfC63Gjd5qJNQ4x3nxyd/aKpvNcIlDIV/xtm8h0nfER+8mvaRHFrZ4/XOeNWMMWNzFGjce3Ui4JxuA3RlHVUT+4bgfyATHIMLbIuNSV+uHDDcVj5IKkt2bZOwGY8dQF4iok+twtq/8i9NDdwKcrlqMDRgpUpMBgo9y1DVLZNSJVYg1YxXB3B46J1zqvHm9P2sVVIT64HPtU1ad9tGClkaU3OFnj5EJSciZyZ7vIyphv2d6BQXSFsA7Jx1NE3qauA7I2s6GVxsQ1cmXYXiXXGVXXWcCHwg2U1sTDVsr9DpQi3ngElZR9OE7gcWgT5hE+cmG3cAsgfES3a3zjoa01xEweVwI8DjWQfThL6aC9xNTgKbODep6y4uRfCTk6NpD8s6HtN0bkNY7bwLFVgRLzU11XIrql8pl0N/w0LbMGjS1dW7jLKL18icGp8mZ0x1DaF8zyFrHCo4WAZ8LjmX24xPGfjvUrn8V3FWk9Kkq1KjSHBeCna6oKmBEPiqID9SVdzAorl4ZR0qFwGfSs6pMGN3E/DtfK6NgYU2dGXSM2f+0kpVbWV7gY/Z0nxTZSXgv4CPqOiagcVzK/tABhfPxbtwbSjh4qTA2j+yjrRBrQWu8PCgiK3bNekq+wAV6QDOq+wWNqZqomfbJaicj/LohmMonhpjWbnwRHK4YXHhV4H3xZMkZrSuQ7naeRiwcz5Mio644EdMGJqAQ0+xUiWmyh4Gzvcqn1ZYFXU4NnjGIP3AwhMQzfmy5n8CcmoyHGM2zxqBL+NYZat2TZq6e5cRrO9kfeeaw6gcEDU565hM07gbONt5vSLAD6141n6258zy3rDwePKUUcJfJC2Zq4Bnn6Vunut64BpRuGGx9T5MelQl6m5sA/IxYM+s4zFN41bgPev82m+vd6XywOLnlmLa6DKhgcXHI2VFA/kL6PuB/waG04i4Qa0BvuyVJ23gwKSpu6cPp7QB5yQHwhkzXhqlAeBd3vn+iTJRf77olRv9i5tcZzp42csY+vs0xHE/Gp8f8ElgVS2jbmDXKbocUQYWWu/DpKMwfymydhJe4hLtZ0J8LIMx4xEC31bhVMT9UlQYeJ4Rlc1qL3f19kcf2kX1zcAn7CSzZxgC3oFw5aAlD5OS2cWl5HB49GCQbwD7ZB2TaXhrgc8LerGqeyTIlbj+kpc/7xdsVotlxcLjmT1v6XCo/mu5IPeP+GS9Sgl4A79EuC7rIExrcbioqbiNIB+35GGq4GHgUyp8UZGhFYs2bw/bZm+VXrnkRCaEk33JlfriFjdck4yVtbK4u4eXR6z3YdLSPW8ZLvR5gbPj40WNGZ87gTNQvUI8QytG8SwbVa2Naz5X4OYFr0CR36K8G/hmsjuxVf0J9KfYpkGTku7eftaFq/GBew3wfpv3MOP0C+BdnXR+L5BceXCUK0jHVKwp7t4If6fSAlqSrEJqRT9o72i/OwzDrOMwLWDOvKV4lM78lP2T0wW3zDom07Cih9aPQU8NxA3c/OBdev2iY0f9TcZc7W9w0VxEeMy5+KyB+cADY/1eDep+4Icj60vceKmNIpja84FDKud6fNzmIM04DAFXCJwOctv1C4/jyW+8fUzfaFzd34GFcyn09q3HyRfxGj1QL0qOx20Fg06clXtpMkcWr0EUCSQMNHp/KIHEFQpFklWLqopXIVShFPp86CTkxjG03kaj0NMHZfIEnAVsfFG+MS/sEeCzIJ9X1TWjHbJ6tqpse+su9tE7rcSCx/MviQtuQXeT1+IZBk4FvjVoNa8azuxzrsWXc+TahztUmCKi26LMAp0Jsg2wFbAFMBGYkDS0csk9HSa///XJvqgngH8K3KXwt6hnqk4e71y/rtR/1KvgdeN/G8yZ38/2O83i3rvu/Tfg/wHTqvKDMK3mr8CHRf13FQkHN7KzfLSq9pAvzOuL32Li2UXh08Drm/gM5t8CJwH/sARS/17/1q/z9112YcK6dR0KM4ADklfUW94LmJkkio4x9so1SShrgPuAPyT3yI2Vc2X9EyA6uGj0b9jZ85cShAEq+lLgf6xUiRmjm4APrm1ftaKjNFFvXPD8+zs2V9V7CYViX/RemY7K/HhpWHMWdrtI9JEL1M1kcKFVza5Xhd4+VLUdZBep9IqPTo53nZkctFTLXnKYHBX9R+Ba4Go0/nzdaIYNKu8ndkT5MlDbcTLTjMrAD4ELygG3t5XghiXVa/TW5A1U6OmLmmSdInExxg9TafU1i+ih8CpghfU+6s+hZw8wa8qDPDY0bTpoAXhNkjhmZrjk1ScbtVYC3xO4Nq/hQyqi1y46cZNfFCePSgNsAfGEZ1MPC5vqi3rEX1C4WODhWjyvanZDRje/ok6QE5N5kWaZXL8O1ddFiaQaY4imegq9y0CZDvKKpJL0S5KhqXqyPhni+j/gxwF6l0J4w7OGt7p7lgMuUCmfm5wU2pFZxKYRPRTfN54vIQyNd7J8U2raoukq9jFVAp7Q8BCJZ/45ZjxLh+uAAh8NfPCptR3r+OVnTso6HgPM7u3HeT8RkZcnh6Ed2QAP3DDZAfzjqFfi0FvKbcHatnUjlHMBysMI27we+A9g26yDNQ3lNuDfFX4S3WcrajhSUvMu8Yt7f8IUncCwlHcUjc9pfgvE5acb0aPJEsqbbfgqe93n9iOK8zk9BOhJFjZMyjquUdLkvroJ+InATaryD0QPS1Zc7Z51gKZhaHIu0XmvCf/5q6uCrXl2z7baUhlTffnpfTw5WaP/vC1E5OzkzT41jWtXWb+IviE+1nGhDV9lpXDO1UguANWpKvJuiPdG7JR1XFUQJkMPdwM7WNVrMwol4BvAx0RKd3vfyYrFx9T8oqkMJ/3sC3NZsegEJJBVuHgo65zkTdJoBvG5VaGszzqOlnXou1eyx0EPRU2tA1Tkv6ksGW+G5BEJksn+Iyx5mFF4ErhI0Xmq3D1x4nAqyYMsVnUcee61hGUnbe0jR1V2RPLitGMYo+iX9Oqoi2jDV9mYM29p1IvNJYUEPw7sm3VMxmTsHoELUfk/hOGBzSzDXi2pT2jfeOkxtLUPq4PrQN+RTCI2wpnrdwB/yTqIVtVd7EOdm+ADF/Ve/9OShzH8DvS0DqdfyzmfevIgqxVRg4tOIIxSiAtvAz0duCIp8FXPfhH4/EOithQ/TYXzrqar2I8Xtlb4THK08lZZx2VMhjTemApvK4tfvt47vTajOdlMn4Yn/uYB1n79D0ggE1X1vcCHqFQbrTfDwLuAb9rwVXoOm/9jJoUTKEm4o4OLgTfY+RemxY0AXwc+5kPuC/IwsCC7Z1KmezKWHjKDwSVzQf1awV8OnJkMFdWbR1B+k3UQreQlxZ8yOZxImXB3V9kLcYolD9PinoyrEqgW8XqfdmSbPMg6gWwwsOgElHw5rzOvBN4er3aqr+Ny/4TwYNZBtIrC/D7yPk9JynuJxMObJ2XdWzYmY/cD89W7T6oGqwaXnMCNF2c/GlIXCYR4XuRYrl38IsTpzWh85vo36ui43D8Mr+UJF2QdRvObPX8pEjrEsbdUNtKlPzNoTH35M/B+B19yzg+vWHJc1vE8pW4SyAYDC+LJoLsUzgUWAaszDmkY+E37RLjhkuwzfjM77rwbEA8qfneBz1n1WWP4hcBp/i9TrvKecKDO5mDrLoFEKoW/5FFfKX1yXsbH5T6u8PsMr98yhsNhRNyMpPhm/TSzjMnGdaieVkJunLLXY5X54jpTlwkksmLR8QQwHKh+AXgvcGtGodwp2PxHrSWlyyehXJBs2DSmVXngKuB0FXfrTYuO5+pF1TkAqtrqNoFEBhbPJRTxvhxvNnw7sDyDyfXbVXiinmb0m02huAwNhgR4W1KGva7vS2NqKAS+KRIfxvfXFRlsDhyNun+jDi6aS9tE8D4+IvRdwE9TDuF2h5afeGx6ypdtJYKEnQcnRTbr7fwOY9IStVO/jdKr2hjHZdd9Aolcd9FcCJThnP9HcuZ0WtYBf1YVbv3KoSletnV0xQePxUnjHCtdblrcalU+j/BQIyQPGiWBREShrSRbAgekeNnVUQ8kxeu1lFe87zfxL1YqE+Y272FaXZvAdlkHMRoNs7NXoseMxGerp9lKvTfehW5qYvXER6IWzJYK7we2yDoeYzLWgbBX1kGMRsP0QBK7pHzi3N2ga+prU3xzmH3+j1B1qMpJwFFZx2NMndhx3T/z0nVuf9ZxbJZGSyDbAPkUr3fvLrPWrlOrwFt1brgTxE+HuOpAvZ9fbkxatuncujQB1xiN1kZLIFskp7al5b677pvEisX1vZSugUU/2MOzDsKYOjIVob1RKr81WAKRCSnGPATck1w3pUu2hq5iP4pMBt4MdGYdjzF1ZKpAR6M8cRosgWiaD5uhZBLdVJnEc0p6aJRLso7FmDoztZGGdBsigRx+5s+Jq+ylu8lsnZUwqb7ZPf2UvHMCJwPTso7HmDozGbRhNtM2RAJpb1/F+iAONc3M/LjW/zG7DceJkhO/g1XaNWaj8iANs6S9IRIIKJNHylGsbSle9BGQ4RSv1zJEmA3skXUcxtQh10jlfBoigYQijEjOpbzx8RFRhm0LSPUUepdBoC4p1Z5mY8CYRuEaaWFJQyQQ0XgneuoJxHs/kuL1mp9K1BqYCRycdSjG1CnrgVSbVFbuSMp7QB5zEoSaC1O8ZEvYzYomGrNJYj2QKvMi+PR7IGvUeVZc8rIUL9kSDmykFpYxKbMhrGpzKE40zQSiwNqUrtUSCvOvRR67g6SackPcd8ZkwBJItWnl/yTFeMuWQKpMy+j0PSYBO2UdijF1TBqpSnpjBFpZCSVIagkkTA6TMtVS+R1OSwpiGmM2rSEa9jRMApGn/n9aJWKsB1IbWwCteDZw1CBZn8F5/mlIe3HL06+7sQdtsInnRKOUl8rq5zkmjZFAKodJRW+/tG4CD9gS3uqbUCnV0FKipPFN0G9mHUiNRG/OLJ4jm5oTzW0kWbhNJJZcsh9pw6s9uUenJq9ZwM7JxzR7BdYDqSpNkoeklkA0SSKmuiY3UqG4KvkF8DGQvzXKOdetqlDsI58vS6mUEzyBCHmFPRAWA8ekGIr1QKpKNvJZ7VkCqb4JDTSUUA1DwGVe5G+dJdtPVO+SBK8bGpBH9gyUcjL0e0W+BnH5nfaUQmmYBNIwXaWU50CsB1Ib+RZLIHcBK5wqyy87MetYzCjduLg7GfjgV8DjWcdTjxopgaQ5AWkJpDYapmVVJdNBdss6CDMOElfgeRjiV1oaprvaSAmEJl3F0kpGWux3uC3o+QIzCsW+rGMxY6EavUrAoyle1RJIDWiKDx+XDLeY6hpqsQQSOVZhHtBuSaTxaHx+pqS9rN8SSLVJZeQ8rWEll+KEWStp1r0Qzye6l04HXhcGjqPmLcs6HjMq8Wi2pvhQ12QfWkNojASiinpNswcSWAKpibUtusN/C+CCIPQHh66V1hA0g3i/Ypq/tPjQgxSvNy6NkUBENqzdSXMIq9X2K6ThyZTHkuvJvsCnRXW7Qq8NZTUK+deHtA5Ai1rK1gOpprjroWI9kIYWr8KOEshjWUeSobkq8kFV6ejq7c86FrOZpPI8SOsIgugZ1zBHaTdEAolbAY40xyHTvGFagosrYcoq4J9Zx5Kh6L46TdC3DT0yUY74wLVZx2M2Tw6YlNK1fLLYpCE0RAKJ10Ko+hQnl6Kfy1R1wtx3/TClSza3KROVsvr1wO1Zx5KxycBHJkxfe3SQb5iRipamaD6Zx0qDb6R5woZIIKKC85JmAolM81sKQ1OsI1INP/7E8RumIn/fSKtMamQH0M8I7GXzIfVPVCanOCJhCaTavEAYpJ5ApgaPhPmW2ztde7cBq7MOog68BOETXpneVezjoM9YIqlbwlYpzolGjztLINWkCmGZ1BOIIHlbdFl199gw1lNe66AXfPukR6xyTh3bNs0EomIJpKqcKPmgnHoCUSTfarveain0yuCirz8E/DLrWOpEDjhDcG/uGF4rR5/zs6zjMRu3bYrL+kNR1qR0rXFrjATiPaFrS3t52za2F6S6blxyAoXi26JPr2+kpYo1NgW4cLh98pxSPkd3jw1l1Yuu4k+Ryhj2jBQLga5WG8Kqro/88Umcj1fwprm8bSvQtFZetIxkSPBXwJ1Zx1JHdgIuFpW9fHyw0fKs4zHx5Hke1TCfnEiYlsdB1jfKqQcNkUCO63vThk/TTCCdwMwUr9cS1CtSKt8D2E66Z3op6CcI2NK7hqlk0dRUQF28+mqHFC/7BKrD8cRvA2iIBPI0aSaQDmD7FK/XEgaXnIDmc9Hb46r4zWKe7mTx9KDSPtuW92YuroKlTAR2TPGyqxDWN0gHpOESyJoUd6N3VHogAl/eKqVLtoq4SPavgZuyjqTO5IEPOOWUkYk5uiyJ1IMZlYPBUvMYHaUhgsZYlddoCeSJlGvlzxosbsns276Z4iWb3+CiE6L23Srgf5MS7+ZfpgAf7Vhd7goQunqs/HuWFHaFuBeSlgcYynuZ2Bil+BotgTyQnGqXll26Fj46SWxIulaWWS9ko3ZF+IxHdxURCh8ezDqelnNssW9D5dbdkvnQNJSBuxEYuPDolC45Po2WQP6e8uH2u4FOaZDhyIYyNBLgJC7t/pVGKh6XotkoF6oyTYfsx5O2uJWqkgf2SPGyQ422ybZxEoho9HoY+EuKV91WkBmNMqHVSH71uWPjLbeKXGUrsjYquutOEeFM0Lwdh5uupPcxGdgzxcuuS0ZZGkbDJJD4mK68rk56IWmZiKTaAmkpg4uOR9BVwOUtXuZ9U9qAcwV53TDr6SrafEha4tNrRKcDO6d42WnAy5XQNcrvuiESSKGnj6BELhhxrwWOTfHSHVEX1nnHwR++KsXLthJBxQ0mE+qNsfg9XdFD7GPtdLw4ng+ZZz2RFO0FTE3xelGD4TwhOEVFGyKJ1H0CiX+IolN8IEXgCmCXlEPYOwx8+6Qhq2pSC3EvRP0IwmXR/8w6njoVPcg+ibJ9/b9jG9+c867ZsI9v/xQPktpgW2ChU/dW1SDX1VPfo7t1fTsWeqPkwQyQS6JWWKW8SOpeJMqWGVy3ZXgXIN7fEz8kG2wMOEXHA0XEd8TvC1MzvhwiGvcG9ssohBnAYif+PU7qe/6rLhNI4ZyfUvjQdaCyv6h8EXh3hoUNd5B0x0FbzsoFx6ISAHJd9MaxVVkbFb1XT0PdKb9dcAKF+VdnHU/zqmxBn55hAiEZuvyMwr8DU7rrdFNp3SWQ7t5luPbAUSodB3wVeEWKlTA3ZrLCQRlevyVUhrI0FM/nk6W9jbEVN11TgN5Devv2wttJZ7UlOydFLrO0BZUEcpF6tqvHnkhdJZA5PcuQkDYfulOBLwOHZB1TcmbDgfjQFWxXcE0NLJ6LOtagfAr4Sdbx1KldNNuWcas4JFnGm7UO4H0IV6jq7nPqbE6kbhJIoacvanJO9U7OBxalXAHzheyPC6YjtiGk1rx30V35AHBecm6IeaZ/IvLXrINoVtFziDBuNB6SNB7rQdTdfI2IfMmjhx303ps59t/rY1Vo5gmkq7efqGumTnZE5FLg/JSXzm2OvVJeD96yVi45jqDkCQP3F+AsYEXWMdWRIeD/EeofbcFzrSg43Ro4OOtIniVqvXYjfG3ypCdPHB7KSVfP0qxjyjaBnHLajxiZkEOVQ0T1S8Dbk4qk9SZKaEfEv0N749bc9ZedSJt6Qs8fkySyMuuY6sAwcLk6/U8CDQcXz806nuYkgojsTqWIYj3aF/iCBLl34IK2qAGepczGZLrP7Y+exQGBvhK4KPnB1LNvifpTFRkeXHxC1rG0hO7e5fhwBOdyeypcDLwq4wUVWXkCWKzIpQKrBxcdn3U8TWnuBctZuy7EOfkg8Jksn4+bYRVwmYouQcInyqVp3HzpEakHkUkPpFBchga+k0DfD/xXAySPyKEqbqbNg6RnYOFxdAwLoQtuF5UzkoUVpazjStk/kv0fnxW8JY8aGhryBCITgSPrPHmwYYWWqFzqfDArJ2s56rz0l3anmkC6L1ielGKQ6SAfo9Kq3DbNGMZhFugBWQfRapZf8TJc55Oo6IPAfODjEFfxbQW3AO8NR3Jf1TAYqZyjYmomHqGWHetw/mNT8sDbFPmiOL+/GyrT1ZvuefqpJZDZPf3kh8PoirvHE4HQk/JBLePVCRz1gFvNkcXsJ69ayeAnTmZw0dzodl0F7hLgdIjnR5rVCPA94C3TTh/5aZAr+xVLrOeRCtGXNlCjluQZfiLwtVJb+3Gi3qW5XySVBNLV20c57xlRmR39hwJvrKMlcqMg3TPCyTOD7BevtaTBRcex1cOrS4PvPv77yT30VWBt1nFV2T3x5jHhPVrWW9d8awKDS2zCvNYKvUtBwrakWGtb1vGMwcHJEO+piG9Lq9xNzR/ihXn9aMnl2jR8HcQbxHav9TVraG+EQ4H7sw6kVf3gf07m+Jn9DCl/co6zVLkmGdravwHGrZ/POuAqYHHZu18L6m+8zBJHajRqFOqOwOFZhzIOO8R76NTtILCku9j35MCi2t5DNX3DdVeWmE1SjSfLz8uoGGK1/QcufzYa6uDC47KOpaXNveAauo7ZieU/+9vuCu8E/i3Zr9NIiWQkOdb3C4L82BOubmMC1y7qzjqulpIM+7wd+O863UowGsPA14FPiOi9YRjE+6tqoSZvtCM+2EdbKT4EaluFj8RF4LIrhlhtvwNOAu4brHF2N5unq6cPlADH/lKZH3kNsF2dJ5KR5F76GnBlPsfDIyVYYfs7UtdVXIZCh0M2DK83AwWWRQ13vzr3Bze1xOAl1V+EUfU3WKG4HCR6b+T2Q+P9Ha/MesNila0H3gp8zxJIfSnM70O8tilyIPAG4NWVc+3rau/Ik0mP4zsKP3tyK/fghDWemz9t91JWkt7HQUn9te2zjqfKfgt8KNRcv5NQV1R5GXhVE0ihdynqSiJh+9HJEt0XV/P715Gve/XvFpGRFba0su509y5DRJ33bvdk8+GJEM9dZVUipwzcDVwL/FCElV5k1YoFtrIqa4d9qJ+JI4oXGmHz4FjdB1yo6DeA4Wo+s6r2w+rq7UdVc67S8vt0BicHpumepMz8rdYLqV+z519DKG20+aGpqnECeTlwdNIrmVzjh0XUU30I+GUlccg1oHc5XOmGRTZ3Vi+S1UpbovJ9YE7W8dTQKmAJymUi+sRAlZJIVd5AhWI/gk5SOCOZLJ9eje9bxzzwQfEsLE3PcdOHj8k6HvMCuisPigCVrRQOiNo8wEuAPZOeSWeyfHM0w12a9C5KScJ4EvhbMmzwK+A3CvdOeXT60H37/olbzntb7f4DzZgkw1fR0/Q7yXkrzWwY+GbUGwHurUbjd9wJpNDbh6rfTnAfBt6VvBFbwQDCa4FHBxdaL6SRHF1cjiBSJpyoMA10B5AZcUu0srm1I3lv5DYxfyfJJPjqJGlErwcR7kd5PAjCNd47P7DQhjfrWXdxWdTwzXvcFcmpp60gavxeEzWAJ02e8tu1a1YzsHDsQ6ljTiDHFZeyijzthPsIfDYZHqinycpaWwOcAvzUhrGMaTzdld7HAQo/BnbMOp6U3RolEedZpkI4MMbVf2NaHVXoXcZwoNJBeIxU1huf1GLJIzIp3negvr1QB3X5jTGbr2veNeA8Wlny3WrJI/Ii4IvecXoYaHvXGHeujzqBxGumlTxh8LZk6/yhY7pyczgOcQdbhV5jGozzeB9sn+wZalUzgUucl48JTOvqHX1DeFQJJM5SwiRBivGMfvaHzmdtW+CNkhNXmF9/B94bYzZBFUFPTFrirWxSfFyAyudE3a5dozxzfbOazl3FfkRCFDdDNJ7BPxVoH2vETebOymZJ+bOd1WBM/UtO8dtKVL/b5Et3R0OT46Pn54e3+/n6CXdw4yWve8EvesEeSKHYjxKCur1F+TzwHksez7AbcHLgOzjyQ9/OOhZjzAsQjV56XLKM21REnYkC8NVS+4Mn5ctTgu55L9wbed4E0vXBa3kyPxOH60pq9ryqycqSVMubQ7dul6A0lTec/uOsYzHGbEJ3bx8iOiUpnNgqWw5GY2/gC170PTg6uovPn0Q2mQwK5y7FDQ8HU0r/eENy7oJl603bD+RNvhzy4N7NVkrHmOYQPQy9CqpydNLaNhu3HbBA0Y/jddqc+Us5/J2DG/2LG00ghd4+yLkJGgRnJacH7lbriBtc1P17q8vldtP7H+HNr7ahLGPqj+LQLUBPSyaPzaZFP5956rhcfbBzfst1zCle85y/9IwEckyxL1mmq1tSmSy/CNg6zagb2L7AKR3blvmdWr41pp50Jce8aqWwptUe2jx54C2KfgmRgzvLntm9z1xt+lQCOfID1xHmQkTdLEEWJ2eWT8gi6gYV9ULeMvxgbvfpez7KoW+9Met4jDEJqSSP6ckioIlZx9NAJE64ylfW5vRYQnVdPf/adBgnkK7zlpN36/Hl3L6IfgF4W2OeWZ65fYB3B6EEU7ZZk3UsxpikkKb6+FH36qSIphm9A4EvOydvCXD57mS/iJszbxniPT4f7A/6ReBlttJqXN4aOg4rOeietzzrWIxpeV4FnJ9pWxDGbUdgiRd9X+jCfFdxGc6LAy9TUT4BHJl1hE1geypl7Tt9EGYdizEtrTC/j3xQFqmMqjTrAXdpmg581Kk71sWnSMe7auJDdmwbdfW8SpTj4p05oywNYIypjtnz++Li5eUwdwCVs/JbreBrrWwFvEkJ291wTgE9zCaWqmoqcBbI1jjNOhZjWpTHO98BnAnsmnU0TWYfkCmufb0Etia6Jo5GebsvqySnnhljUjK7p48cAc6746kcs22qqx1wzk30YXJerqmuPHCGy8khxN1pG8oyJi2BgHqdAcxLRgRMdT0GjDg/HC+4+ltytrOprl1R5omXSUHZhrKMSUN3bz+4wGnlmNrurONpUneistZJZafILcCjWUfUpF6jTl9bykN3jw1lGVNLXb3XRF0P1IezgffaxHlNRK3hWxA/4lTjs1XuBP6cdVRNamLUjc6FspfayYXG1JQjBJHpwHnJknpTfVFn49dR1yNeIzR9m/ZVwHVZR9XEDgKdD0wqvEB5ZGPM2HQX+3CqUaP4ncDcrONpYn8CjTscbsXiuTz68HD0+bU2jFVT/wZ6yqHfn87mHNRijNl8R/UuI1QhRLqBc4C2rGNqYtesDcPH5V8lS+KZkFuA32UdWRObAPT++rWPHqyizLn4pqzjMaZpRMnDOZ0FfBSYlXU8TeyRqLMxMcgxsGhuJYF4rwQ5vwr4aTJBYmpjL9AP4ZjmH16ddSzGNIWu+Nht14Zytp1xXnO/BP39hv8RJ5CVS+YSliRKHf3AvZmG1/xORjkj9D739LLIxpjRi5JHTkoI/jVJsUQrBFs7IfATVV0tUvkx/+uHLfE/twM3ZBhgK8gD5wTOnSSltRR6bT7EmLF48Zt+hQtCQs0dlAxd2YbB2vobsDxKHgMLj4v/xVMJJCeKF0aAHwBrs4yyBWwNfJK2yQfglcIVd2YdjzENp2PW4xAGM4BPA/tlHU8L+Cmiz3hYPZVArlt4QlyYF2UFlY2Fprb2A/0Ejm240xKIMaPRXexD0A6tLI8/Met4WsCjcedCJdxq0r8Grp4xXijA3bsPPQz8OIsIW9ArUYo46Sj02i51YzZHlDzy+Ki9+xYq5Ups3qP2Vqjor6NPfvDx4576l8/4wQ8snstOd3aSJJC/px9jywniw6e8vkdVg66iTaob83wK5y1DR4QR3AnAhcDkrGNqAeuBK/GyVp51PMVzM7cqeP9n4GcpBtjKJgHnC3LScGcbc85dmnU8xtSlucVBNATa9FDgEmCHrGNqEbcKcq0TYWDBCc/4g+ckEBd1DJ0rA99NSvaa2tsO+HTHUOkwH1hv3JiNGWIIQXZOksf+WcfTQn6E73xAN7JF8DlPqxsWnYioRL+oXwADaUVo2Dd6Yyjs3mUHUBnzDPGhbBKfx/3J+LA2k5a7gB+oW8fgoueWF9toc1ckxEu8lPcbwLo0ojSxowUWIzqr0GvzIcYQJ49+BKag8ZzHKcl6H5OOH4C7bVM/8o0mkLgXQpxJrgN+UeMAzTO9QlQuRmVrq9xrWl0hLlNCp8IHgdOBXNYxtZD7gW+B9/iNV7ja9IB75aCQR4H/A0o1DNI8k0taWR8DP6XLlveaFtXd04eobxP0A0mF3fasY2oxVwv6u+iBNLhk49XxN5lAnjbe9ROr0pu6oLK+Xc5HdaINZ5lWU+jpi9qwORV5F3B+cjCbSU/UefiGipR86Df5l15gyY/gJYy6MV9PCmmZ9LRFrS5BPox3Ews9NpxlWkNcH85JDsdpwKeALbKOqQVdI+jNDmXw0k1v9H/eBDK46HiEABV+BPyhFlGa59UBnIvo+ep0og1nmWaXFBfNofqOpMbV9KxjakGrFf5XCIZGdNO9DzanBEC8LcTLPcD/Wi8kE1ES6RHlfPUycbb1REyTmlNcjlMJUH0bcLElj8wsd6LXqXhuWvSy5/2LL5hABhfNReMqi1wJ/L6KQZrNFycRJ3qBE53Sfd5S9nzxQ1nHZEzVRA2jUDXv8acCnwW2yjqmFvUE8N+qsuYFOh+xzdr2LAiKj3ohXwHKVQjSjF6URIrARWEo07ct3MIB530365iMGbfu4jIC8R0ieiawIDnuwGRjqapcryoMLt74yqun26wEMrDo+Khriah+H/hNNaI0Y9IGvNchCxHdbopuwTEfsBVapnF1V07lnKBIb7LLfFrWMbWwx4AvidN1bjNPNh/Vjs7uYl/0bd8D/EfyMDPZCJPa/EXnyveUy52svPSorGMyZrMVin2V84dgCxX+HeLzzDuzjqvFfR3hdIT1gwteuPfBaOvoJznph8DKMYVnqiUAXovo5z3Bi0YQunutiq9pDIf3/oycd6gwSyUesppnySNzD0e9D9j85MFoE0iyuTC60H/ZsbeZi353L0P5akcwfLQTJ922zNfUudnzljExaKcsfj/g8xDv9bDRjOx9P0Rv8rp5Q1cbjL52eFzhhKi5a+tJ68OhwJdDz5tVNG8nG5p6VSj2430bI+WwG4kX5LzCThOsC38H/a8cMrJy0Qmj+sJR//IGF89FhFWgVwCPjPbrTU3sDFyGl3M0dJO6bK+IqTOFuK4V7blc6ZSowQO8OOuYTCzqcnxtva7+XXkMJQ/HVBY5qc3UhsqlwPvH8j1MTQwB34x38Ap3RbfGxmr4G5Om5KjmaYLMA86ylVZ15TcKrwXuXjGGZ8WYuo+DC6NujoxE3R7gb2P5HqYmOoF3AV9F+f/s3QuUXVWZ4PH/d8699UogkAgKKDSIwyii+GiVpKoigoFGpl9LZ3rZra3dY+tSUUIlDNrLsXG6oZU8QLuZZmTaGVi2PbT0LOxGSCU8kqoEaBHCIyCQAHmQF0kgqVTVrXvv2V+vc+4uV5RHKlXn3nPure/HOitxLXNrr7r3nu98e+/v292FUSe9l9o2X5ONeQtXce7XbkeQtwryPWot2S145McY8HeBBJs1mlzD9UnPPwYO2irho37l3lqc5EecVfYCN1c7g89qIB09l9m6iGmsnsX9hO0aVMvFc4GbgE/aYnnurFbhVqeOtdd+bFIvMKWTvZJjJtGTQG4B5k7ltUxdHEgKg2CZK0TbwlKR1dedn/WYTItLajzgGIXP+O4Jb856TOYVXgb+GOEnA0smP809pR0QUdgR//ECcC0wNJXXMnVxNPAVhX+UanihK7iwx85bN3XSe3k/C/5yRfxYeqbWtvr/tQWP3PoRSv8EC85f05TPFu6u3ZC6pLan+1NTfT1TNzuB60T5vsLeifS5MWaiuvvuRAk6Avht4BvAO7Mek3lNTwIfB56Y6iabVA6n76m1OHmv1Dr2npbGa5q6qAC3K/yVBMFDqLqBJR/Nekymic29op+T7mlnZ/fY6b6i/A/tAKhcG4vfp/Yw/J+j1Sprlx1Z3cevS6eIRxRpH3sYuN7OT8+1IvC7Arfi3GJ17jib0jKT1dO3krCiHTu7x/7AH/fwBQseuRenij8ai6IpBw/SykAYXzgTjlNN6hBspTb/qsAqkKsCCdaBRquX2NtmDm/e5T+hGg7TVp5zRnJiZi3rOCrrcZnD2gHySdB706oPK6TyKkBpeCadM4deBLkGeBdwfFqvbeoifu8vBH230+gGgRvnXnb7C6HMZGDp/KzHZnJo3qIVhCq4iGPaoo4467gEeHuaD6Kmbhzwf5wLB0UmcFLUBKX6xtfqDaSA6F9A0qLZ+tw0hwj4edKmX+W2MKweKJc7WHfduVmPy+TAgi/2MzJDERc/dEiv35p7HtCe9djMhA36WpytaXanSPUGn+zsEa36LpuDab62qasQ+EDyvoneFLnw/KAQtXX3rcp6XCZjcy9ZxVBQCIjknSDLku2fcJEFj6ayG7gKka1E6WUf1CP1nNt3NwUqKHJR0lLDjqdsRnuTnlrKjVEUbBAhWnutrY9MJ/MXrqBzaJTho7vegiRPrn8KvC3rcZkjFkeMbweq31SorElh4fxQdZm77OlbGb9yAdUrgStsKqspKbDFN2f8AZFsIsANLLNtv61sfl8/Q1VlZkFmA7+j8CXgbJ+lmuZzr6J/CGwfPMJW7RNRt8Uvvz30pOSYRLDJ9OYVP8E849/Hf2gbC56vFp2uXm6FiK2kZ+GdhLOOJTqwfw7CxdTakHzQTgpsajtBPy0arNRClYHv/FbqP6BuAaS3bwVOA0Q0vtP8X+BN9fpZpiHiQPIYcJOi/9+F1c3iArd2SfofStM48xffSVfnKAeHZxwLXOCnqrqBjqzHZqYkAq6SQL+lKtWp9Lt6PXXdflerUNdQkCuAb/pCNtPcqsBTvnDsnwNN2iJUV1trlKbiZwhE4ERNtnPzB74halfWYzOpuFOEz6LsXFPHM4Hqvn/bH7E6B+VG4Hfr/fNMwyiwOQ4iCP+gIhtEKA18x9ZI8ix5qNMoQAonC/p7vgjwLGu13lI2xe+rwAMRAWuX1m8DTN0DSJwiuyiIf9L7gB8CZ9T7Z5qGUt+o8W6Q24B7otDtFRVde41lJXnRfdkqBO1E9F3UGh7+tv8u2qxAazkIXOqq5b8PCkUdqMPC+aEaUkHa27eSzrZZjJRf/gzwXWt70LJGagWJ+hOQ23FsjEQq62znVibmJh1yk8re40DO9TMA5/ouEVY93noccL0L9HJRRgeX1Dd40MgPUW9tKqtDlauBr9jW3pYW+emt1cAKVNc6gh0C0aAFk7rq7ltBkSIVKkcJcpZfGI9TwXfbjqqWd29ySBRsSbPa/PU09CkkWbhTTkKSAkOrTJseSsDTtSku/hWRhzrbZ72kzrHy6g9lPbaWcME3bmX//mMpFsttSnCa1ALGhb67wGzLNqaFLcCnnLKmEMDqOu26+nWNDSCXrkCKoI55IDcDpzby5+dctdYtk4eBUR9g52Q9qBSpP2J3vc9M4oDyeLHUuc8Vqnqv9d06Ih//o+fZ8aYnCF2xXdFTEM7xn5l5wMktVvg35D8vZUjWUt9si/6/YgS4XCS4XlFt5Bk/DX8y6e3rZ6Tk6OwIPgtcN83XQ+Kn862+keFdAvcjukkI1GlSP/N14DdbcLpvPJhsANb4m8PTqMQBtGzV7q+uu28FkSqFQGahcrLPMM4DPuRvqq24IB5/Rq5W5DZBK4iejMoH/FrOB/xD6MysB5mhCPhbkPheMTywtLHfnUxS2/mL7oz/aHcaXAksarGnpcMp+W12A/GNU1V+JqLbO0XKZVXuXbqAeZfdRnvQQcVxCiKX+3nNGVkPvE7UZ1ybgUeA+5JL2RhUg5c1UF1z7fQNKPMX34mghciFJ/hjEnqB9wNn+gw1tSMZcmYM+LEqf1XQ6i80CHT10gt5z+f7efPxjpcOSkFE3oDwHuDDPqD8x2n4QHo78Kei7Do4Ex76VmN3PmY2N5r0y0p2g+j3/ZbCVjYMbATW1Q5x4mfqZHtbWzl69rnTeP6Wt7/iH3z48juIqgVEtEtrRV6L/Rek1Tlgnz+3eb3Pzp5EeIEw3KVVrQ7WcV97ltqPGuUjf34HB3fP7EI4EfgNSG6Q7/VnjJ82TQr9tgHLgf8tgdsfjbWx9rsfedX/44cXrkBUg2oob4DgbNDzfJA9Azi24SNvrMcUPh2IW191RdYtO6/hA8gsgHRfvpKgomjAO4Cb/NxmKxn2Fdv3A3cIPCi1tsouvkNOdJfEOV+6h+Eds5h16p746fMbwH+aZq20Iz8HvtlPZzwIPAFsB90dVYK95Y5S9W1ROz9q0M6TNLz/iwOccebDbN50ZptI9EbgBB8wzvIBI74BnuhbikyXRfD4vV6j8BfVihsMAty6ay+c8D/uXpw8lIqoHoMmu87i1HW+P/Rqdj0HnoFdwOdU+ReRid9P0pbpB7NnYT8UHETB+Qh/D7wly/GkYNQHjcHk7GH0QUVfZKzdyZyXGLjy9yf9wt0LVyGBzgL9r8BXW+B3NVnqz93f4zcdPOsDyi9AtoLuVWWvIvuLoVa6ZqiOjQl3Xd34L9j8vluTxSvHDFGCoqKzVeQ4iTNv5RTgdD8Vdapfwzh6mk3nHip+P29E+K6o7Fgzxbn8nkUrIHCiUThLakF5gZ/min/fx6Q26myUgD+vRHKdCNF9y7Ob4s38yabnKz9Fq1WRzo4/AZb5L1EzGandvBhAWYnwcMFFOwTRShCk+mTQs2hV/I4FOP0A6GJ/sI81vatxPlPZ5689foPC5iRbUfYg7PeL9wdE9YALdRiViqiooKqgBQ01LL/y0B0nDlcsQKgSaVXi1Dl52EXiG35HIG6GIl1oslZ1tF+fOMFnESf6ztTH+/Nx5kyzzOL1VOPvjsC3keBu0MqalHcR9fTdEb+BEAaz0WQq8CM+mJzlg0kzvQ/xh/N/+Sntg1llHuNy8YvrjZ8WoE1VvuaPws37FM2wDxprgDhvXl91bqeArls+8ZR7snr7Vsa3u1lIsjZyqZ/uyMV7mWORD/ZDvt3DQZ8xlvz7OXLIn5VX+ffidzm1+6vNF+Yd7Tc4dB5yzfTXdM0mJuoF4AaU7yPsbMTN8PQrbmbjG35M944vHSu1bGQ8mLzLr5nk/Xv0U4XPBaLbxyohD1yX7Xpgbn5Z3bXuoEcLLPEtpfO0dVX9zeXJ8aAhsD6sRrvjR9d7r218S/O5i/upFFXax+QdUqvs/8Q0WDQ0rSEO3D8VWKYueADRKIut2x/78u3cfsYJ9D63Z1ayFqu/DCbv9msmeboHxR4S+IyKPNbIWo/Xk5sAgq8RUfREkOuB38l4OO6QWoVB4C6FR13EbhF0bU4OVOpOTn90HaISP4pc4hcN857Bmekp8lu1vwf8s8KBwZxsfPjIV9bw5NtXcfrGnlmonoEkgaTH74J7Yw6yyWcRPqeOuwdzdHRCrgIIvv27KqcLfN/v726k8QK3x/1221WiPFkNwn2BOh1scJHORF34hQcZOupFwqgwR0U/CXzZn1+du/fXTFs7IGlhdEPX6Ojm0Y4O0j6fOy1zv/X/KGw/BTfjQJcgp4PO94vw7/drWI0OJi8CXxxYsuDHvX0rWZOjQttc3mD8YTfvSXZl1LY01lMcNPb70/bujTMN0A2EuhcnOtCAjpZp6e5bEWdwIsg7BPkz4L/4pydjsjKU9EBT/tZp+G+glbXLm6eOZ+4Vt7Pu6o/Rvah/ptR2zfX6dZP3++9WvQs54wfar1cl+rtAJVq7tP5rrEcilwFk/hX9RCVBQu3xOw7SLqCL/C6dn/vK59XJVFUUvkTgtNlbaXT7TQmi8iHg85Cccd1su9tMcxsDBhSuF+ivtdnIz9TLZPRcegfFVeupXPDeGQinotLte499yG+rT3vq+CDwlzhdjlAeyGHGlssAQlIjsgrXUSIot10E/E0KjRfL1Ar5HvIBYzUqT5UrwcFi0dGKbcbjTE6gyx9Z+iVIGu5ZS29TT1Wfzd+IcsuMoa49Q8ccZO01+XpynqoPXvKvHHVUJ2NjlTYI3wJ6jl9/nOubWc6Y4v11GLhG4dsCpbwG39wGkNjcS1cxVipI14zyxb7x4pEGkVKtYpkHQFYpug7YumHJguEzF6+gEQeuZK23r5+2oqNcDuaoJJnI53363YqN90x2nG/X8wOFH4bIVodmViHdSB+8pJ+Z7VCOKBLo8dTOYTnfB5S3+ez/SO61+4GrFL4nMJrn32GuAwh+UV1CEa1qnCJ8Gzj7MP9kCHgOWOtT6H8DfSEkLK1u0R5KE9GzaAX7P/oss/pPOwHk48Cf+EKqrHeXmOamvnfVPwr8IMA9pYhbXeejVPMs/q4VRcOKyuwkmGgyzdXj+5kdd5h1k83A/xCCmxVXznPwoBkCCH4qxmlAIO5M3733Yl/NKz5l3uMPLVpTCxyyXoQ9zrnqYA7nDbM0b2E/jkjCMDxZNFlk/5TvFWSBxByJ8cBxK8JNqvKYQLXR7cTzricpTUACmKm1Zpjn+GDyPt+hYLx7cJx13AMsde1unVTFDX4n//eupggg43oXrYw/t52qyc6s9/nUcCvwKLDJOQ4S4NbmPGrnwby+VfEfQaDRyYj8Z+CPfCBp1fbgJj21wJE0QZVHBVcd4igeXjo363HlWs9/u5vCzDYq+0baCTjeV8KPf+ceUdH7oigc6uoocdfVF2c93AlpqgBi0tez8E5EEBU5BeQT1FrHv9NOfDO/xvmp4dtQfugIHg1UqgPLG99C3OSHBRCTGE+1BTkB9CLgk8AHp8n5E+a1VX0Ln1sU/imiuhGR6L4ljW/fY/LHAoj5FfMX9tM2KpS69FgkOU/h036ve7O3wDZHpuTbjtyC6K1DUtrSrkV9YMlFWY/L5IgFEPOqevruIopGCYOOmSruN6XWmyx+7HyrLbi3tBd9R4YfI6zuqAa7yqFjta0rmldhAcQc1rxF/YCGgcqpfgfc7/tNDDa91RqqwDPACoF/EuGhakipYwTu+p4FDvPaLICYCZt32T3M7vwZL5fOnu3Psb/SV92a5vUS8E1U/yWELQ5cXpscmvyxAGKOWHdfP5tGS5ze2fHffRAxzWtQVS4WYb/VcJgjlbcDU0wTGFy6IA4e8V/v9wVQpnltgGgYfeUxvsYcjgUQM2lSmzffl/U4zJT8IqRQrYTVrMdhmpAFEDNpWmshsznrcZhJO4DytMNx/zUfy3ospglZADGTpzLqi8xMc3pZhKfFVkLNJFkAMZMSqKDiqsAvsh6LmbTNiuzWrEdhmpYFEDMpq5d9FKlt4tvkW+ib5rNBcCOWgJjJsgBipmqjryUwzefJSKUaWl8BM0kWQMykafKf2+lPfTTN5QDwTCBwz3es2txMjgUQM2mS/BfYQnpz2ufblxgzaRZAzKSJgCplCyBNaYsiu9SaUZgpsABiJm3NkgX4LaDxk+xI1uMxR2QD6Khge7DM5FkAMWnYaBXpTecJoBpYBxMzBRZAzJTU1kFkG7Aj67GYCUsW0OPkcfVyW0A3k2cBxEyRxteIrYM0lb2+fseYKbEAYqZEBTSScm1O3TSJLQg7bf3cTJUFEDMlA7/x9fFP0dPAaNbjMROyAdWSrZ+bqbIAYqbmyw+CJHeiTdS685r8e6J2jK19/c3U2CfITJmg8bUV2JX1WMxhHahtuxYGlp6f9VhMk7MAYqYsyT9Eh60zb1PYg7DJ1j9MGiyAmBQE4KgAj2c9EnNYWxV22vKHSYMFEDNlxUonKslH6SmglPV4zOt6HLQkFkFMCiyAmCm7+7vdtf28yHO2kJ57G0SJsDkskwILICYdgYLoFmBn1kMxr+lAre2MMLD0o1mPxbQACyAmHUlBuhz09SAmn3YjPKuWfJiUWAAxqZCkM59WgMeyHot5TdsUt1PFOiiadFgAManoHCsT1u5LTwJjWY/HvKrHUSkFzr72Jh32STKpWPE3F1M7W0KfS6ZKTB49FqpEkW3BMimxAGJSo4GitYV0a+2eP/uBjU5g3ZILsh6LaREWQExqxAWICw9aRXou7VJ4znIPkyYLICY18c0pDLQKPJr1WMwrbBFkZ2BbsEyKLICY1ESui0iTZ9wnrbV77jyOMqa2/mFSZAHEpOa+5d1+Qy/PW2fe3HlMAuecZSAmRRZATKrUaXxtA7ZnPRbzSy8BG1WFtcusAt2kxwKISZWEQlAQa+2eLzsRnrf2VyZtFkBMqkTAVYiAR7Iei/ml5wTdFVgFukmZBRCTqvZiQK2ze5KBjGQ9HpN4pFydUY5cmPU4TIuxAGJStfKq88c7hW+2gsJciLPBR9vCEVXbgGVSZgHEpE5FUfQFYFvWYzHJ+Syb4thhC+gmbRZATOoCFQqiI7aQngvbbAHd1Esh6wGY1hM/7UYaOFtIz4VnVNkXOVtAN+mzDMSkrnywffyvTwEHsx3NtPcwBFEhsBTEpM8CiEndAzfMHz+icIsVFGZqDHhccGjVMhCTPgsgpk7iG5bGwWNr1iOZxl4Ano3/Mnjdb2U9FtOCLICYOgkJq+Gob6xosvG8OLYGlnyYOrEAYupDlaiYVB484uezTOM9UigybCfYmnqxj5apjzYZDxtPAUNZD2caivOOn1eirIdhWpkFEFMXA3+9YPyv2/xcvGmsF8frcAaWLsh6LKZFWQAxdSMaIoQ7gC1Zj2Ua2oxofGU9DtPCLICYulmz7Dyci0rA/VmPZRpaXy5U9g7NsH6Wpn4sgJi6CiQpYLsL2Jf1WKaRCBhoq7Tp+it/L+uxmBZmAcTUVdLRRPRB4KdZj2UaeSbO+sQaYJk6swBi6mpgyQWgMoroEuCxrMczDRwAlu6Knt8YUsx6LKbFWQAxdVdxVTpoewTlC8Bav8XUpG8X8DVFbz4+PIV7ln446/GYFmc5rmmIs/7sRWbPug/nOk4G/hj4BHAG0Jb12Jqc82d+3A3cgMggUB1YYmd/mPqzAGIaqnvRKhQJAo3eHP9PoBd4N3AaMMsHFPtcvraKPyp4G7ABuA8YUNUnRGTUaj5MI9kX1WSmZ9EKInVBKOEc4E0obwP+A3AqEGcqbwHeCHT4wFKcJp/Zir/GgL2+IWV8PQ9sRHgaZbsiuwUds6BhsjIdvoymifT03Rl/KANHMEPgaJ+VxEHkJCDOWk5Jgg0cBxwPHHtIcCk2wSFpEVD1AaLs27zs9pXju3zR5VZfvR9fB1T1gDh3QEWiweUXZj1+Y37JAohpGud8tT8JLkEgHSLaidAVBxmFNwBz/BX/fTZwFDDzkGsG0HnIVUxaBtc2khx6He47oX7d4devOCiUgFF/DfvDtA69XvIZxV6/brEH5WWEEREdwcnoW2c/ET2152zWXWsL4Cb/LICYltPz1X4ohAEaFVWkCJpkKFLLTsav8UDSccjVrnKYDEZxUptaKiGU0DhoSAmSM+ArPpBUQSooFUQrFdHy2Jx9UVgu8uA3P96w34Mx9fbvAQAA//9+JPq8HgI/5gAAAABJRU5ErkJggg==",
      "config": {},
      "providers": [
        {
          "name": "aws"
        },
        {
          "name": "azure"
        },
        {
          "name": "generic"
        }
      ],
      "licenseRequired": true,
      "eula": "Generic EULA template\n\nEnd-User License Agreement (\"Agreement\")\n\nLast updated: (add date)\n\nPlease read this End-User License Agreement (\"Agreement\") carefully before clicking the \"I Agree\" button, downloading or using My Application (change this) (\"Application\").\n\nBy clicking the \"I Agree\" button, downloading or using the Application, you are agreeing to be bound by the terms and conditions of this Agreement.\n\nIf you do not agree to the terms of this Agreement, do not click on the \"I Agree\" button and do not download or use the Application.\n\nLicense\n\nMy Company (change this) grants you a revocable, non-exclusive, non-transferable, limited license to download, install and use the Application solely for your personal, non-commercial purposes strictly in accordance with the terms of this Agreement.\n\nRestrictions\n\nYou agree not to, and you will not permit others to:\n\na) license, sell, rent, lease, assign, distribute, transmit, host, outsource, disclose or otherwise commercially exploit the Application or make the Application available to any third party.\n\nThe Restrictions section is for applying certain restrictions on the app usage, e.g. user can't sell app, user can't distribute the app. For the full disclosure section, create your own EULA.\n\nModifications to Application\n\nMy Company (change this) reserves the right to modify, suspend or discontinue, temporarily or permanently, the Application or any service to which it connects, with or without notice and without liability to you.\n\nThe Modifications to Application section is for apps that will be updated or regularly maintained. For the full disclosure section, create your own EULA.\n\nTerm and Termination\n\nThis Agreement shall remain in effect until terminated by you or My Company (change this).\n\nMy Company (change this) may, in its sole discretion, at any time and for any or no reason, suspend or terminate this Agreement with or without prior notice.\n\nThis Agreement will terminate immediately, without prior notice from My Company (change this), in the event that you fail to comply with any provision of this Agreement. You may also terminate this Agreement by deleting the Application and all copies thereof from your mobile device or from your desktop.\n\nUpon termination of this Agreement, you shall cease all use of the Application and delete all copies of the Application from your mobile device or from your desktop.\n\nSeverability\n\nIf any provision of this Agreement is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law and the remaining provisions will continue in full force and effect.\n\nAmendments to this Agreement\n\nMy Company (change this) reserves the right, at its sole discretion, to modify or replace this Agreement at any time. If a revision is material we will provide at least 30 (changes this) days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.\n\nContact Information\n\nIf you have any questions about this Agreement, please contact us.\n",
      "nodeProfiles": [
        {
          "ram": "2.0GB",
          "name": "basic-node",
          "cpuCount": 1,
          "description": "Basic node",
          "requirementsText": "RAM: 2.0GB, CPU: Core x 1"
        },
        {
          "ram": "8.0GB",
          "name": "high-perf-node",
          "cpuCount": 4,
          "description": "High performance node",
          "requirementsText": "RAM: 8.0GB, CPU: Core x 4"
        },
        {
          "ram": "16GB",
          "name": "ultra-perf-node",
          "cpuCount": 8,
          "description": "Ultra performance node",
          "requirementsText": "RAM: 16GB, CPU: Core x 8"
        }
      ]
    },
    "operation": {
      "id": "5ae8e911-5a4e-4217-b4f3-ec5f316939ad",
      "siteId": "test-on-prem",
      "created": "2019-05-14T21:28:05.446Z",
      "updated": "2019-05-14T21:28:05.446Z",
      "state": "install_initiated",
      "type": "operation_install",
      "provisioner": "onprem",
      "installExpand": {
        "profiles": {
          "basic-node": {
            "description": "Basic node",
            "labels": {
              "gravitational.io/k8s-role": "",
              "role": "basic-node"
            },
            "service_role": "",
            "request": {
              "instance_type": "",
              "count": 0
            }
          },
          "high-perf-node": {
            "description": "High performance node",
            "labels": {
              "gravitational.io/k8s-role": "",
              "role": "high-perf-node"
            },
            "service_role": "",
            "request": {
              "instance_type": "",
              "count": 0
            }
          },
          "ultra-perf-node": {
            "description": "Ultra performance node",
            "labels": {
              "gravitational.io/k8s-role": "",
              "role": "ultra-perf-node"
            },
            "service_role": "",
            "request": {
              "instance_type": "",
              "count": 0
            }
          }
        },
        "servers": null,
        "agents": {
          "basic-node": {
            "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da/basic-node\" | sudo bash\n",
            "agent_url": "agent://v6.gravitational.io:32009/basic-node?access_token=30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da",
            "token": "30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da"
          },
          "high-perf-node": {
            "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da/high-perf-node\" | sudo bash\n",
            "agent_url": "agent://v6.gravitational.io:32009/high-perf-node?access_token=30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da",
            "token": "30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da"
          },
          "ultra-perf-node": {
            "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da/ultra-perf-node\" | sudo bash\n",
            "agent_url": "agent://v6.gravitational.io:32009/ultra-perf-node?access_token=30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da",
            "token": "30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da"
          }
        },
        "subnets": {
          "overlay": "10.244.0.0/16",
          "service": "10.100.0.0/16"
        },
        "vars": {
          "system": {
            "cluster_name": "test-on-prem",
            "ops_url": "https://v6.gravitational.io:32009/t",
            "devmode": false,
            "token": "30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da",
            "teleport_proxy_address": "",
            "docker": {}
          },
          "onprem": {
            "pod_cidr": "10.244.0.0/16",
            "service_cidr": "10.100.0.0/16",
            "vxlan_port": 0
          },
          "aws": {
            "ami": "",
            "region": "",
            "access_key": "",
            "secret_key": "",
            "session_token": "",
            "vpc_id": "",
            "vpc_cidr": "",
            "subnet_id": "",
            "subnet_cidr": "",
            "igw_id": "",
            "key_pair": ""
          }
        },
        "package": {
          "repository": "gravitational.io",
          "name": "everything",
          "version": "1.0.0"
        }
      },
      "details": {
        "profiles": {
          "basic-node": {
            "description": "Basic node",
            "labels": {
              "gravitational.io/k8s-role": "",
              "role": "basic-node"
            },
            "service_role": "",
            "request": {
              "instance_type": "",
              "count": 0
            }
          },
          "high-perf-node": {
            "description": "High performance node",
            "labels": {
              "gravitational.io/k8s-role": "",
              "role": "high-perf-node"
            },
            "service_role": "",
            "request": {
              "instance_type": "",
              "count": 0
            }
          },
          "ultra-perf-node": {
            "description": "Ultra performance node",
            "labels": {
              "gravitational.io/k8s-role": "",
              "role": "ultra-perf-node"
            },
            "service_role": "",
            "request": {
              "instance_type": "",
              "count": 0
            }
          }
        },
        "servers": null,
        "agents": {
          "basic-node": {
            "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da/basic-node\" | sudo bash\n",
            "agent_url": "agent://v6.gravitational.io:32009/basic-node?access_token=30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da",
            "token": "30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da"
          },
          "high-perf-node": {
            "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da/high-perf-node\" | sudo bash\n",
            "agent_url": "agent://v6.gravitational.io:32009/high-perf-node?access_token=30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da",
            "token": "30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da"
          },
          "ultra-perf-node": {
            "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da/ultra-perf-node\" | sudo bash\n",
            "agent_url": "agent://v6.gravitational.io:32009/ultra-perf-node?access_token=30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da",
            "token": "30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da"
          }
        },
        "subnets": {
          "overlay": "10.244.0.0/16",
          "service": "10.100.0.0/16"
        },
        "vars": {
          "system": {
            "cluster_name": "test-on-prem",
            "ops_url": "https://v6.gravitational.io:32009/t",
            "devmode": false,
            "token": "30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da",
            "teleport_proxy_address": "",
            "docker": {}
          },
          "onprem": {
            "pod_cidr": "10.244.0.0/16",
            "service_cidr": "10.100.0.0/16",
            "vxlan_port": 0
          },
          "aws": {
            "ami": "",
            "region": "",
            "access_key": "",
            "secret_key": "",
            "session_token": "",
            "vpc_id": "",
            "vpc_cidr": "",
            "subnet_id": "",
            "subnet_cidr": "",
            "igw_id": "",
            "key_pair": ""
          }
        },
        "package": {
          "repository": "gravitational.io",
          "name": "everything",
          "version": "1.0.0"
        }
      }
    },
    "tags": {},
    "selectedProvider": null,
    "clusterName": "",
    "onprem": {
      "serviceSubnet": "10.100.0.0/16",
      "podSubnet": "10.244.0.0/16"
    },
    "aws": {
      "authorized": false,
      "regions": [],
      "useExisting": false,
      "accessKey": "",
      "secretKey": "",
      "sessionToken": "",
      "selectedRegion": "",
      "selectedVpc": "",
      "selectedKeyPair": ""
    },
    "flavors": {
      "options": [
        {
          "name": "basic",
          "isDefault": false,
          "title": "Basic",
          "profiles": [
            {
              "description": "Basic node",
              "requirementsText": "RAM: 2.0GB, CPU: Core x 1",
              "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da/basic-node\" | sudo bash\n",
              "name": "basic-node",
              "instanceTypes": [],
              "instanceTypeFixed": null,
              "count": 1
            }
          ]
        },
        {
          "name": "high-perf",
          "isDefault": true,
          "title": "High performance",
          "profiles": [
            {
              "description": "Basic node",
              "requirementsText": "RAM: 2.0GB, CPU: Core x 1",
              "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da/high-perf-node\" | sudo bash\n",
              "name": "high-perf-node",
              "instanceTypes": [],
              "instanceTypeFixed": null,
              "count": 2
            },
            {
              "description": "Complicated node",
              "requirementsText": "RAM: 900.0GB, CPU: Core x 231",
              "instructions": "\ncurl -s --tlsv1.2 -0  \"https://v6.gravitational.io:32009/t/30ac9f0b7f9696e22b62fa0ed518ec5de6c75d222079de6fe95b7dfbe055d0da/high-perf-node\" | sudo bash\n",
              "name": "low-perf-node",
              "instanceTypes": [],
              "instanceTypeFixed": null,
              "count": 6
            }
          ]
        }
      ],
      "prompt": "Please select performance profile"
    },
    agentServers: makeAgentServers({
      "message": "servers [node-1] are up, waiting for -1 more",
      "servers": [{
        "hostname": "node-1",
        "interfaces": {
          "eth0": {
            "ipv4_addr": "192.168.121.69",
            "name": "eth0"
          },
          "eth1": {
            "ipv4_addr": "172.28.128.101",
            "name": "eth1"
          },
          "eth2": {
            "ipv4_addr": "172.29.128.101",
            "name": "eth2"
          }
        },
        "devices": [{
          "name": "/dev/vda1",
          "type": "part",
          "size_mb": 1
        }],
        "role": "high-perf-node",
        "os": {
          "name": "centos",
          "like": ["rhel", "fedora"],
          "version": "7.4.1708"
        },
        "mounts": [
          {
            name: "tmp",
            source: "/"
          },
          {
            name: "docker-root",
            source: "/"
          }
        ]
      },
      {
        "hostname": "node-1-with-a-long-name",
        "interfaces": {
          "eth0": {
            "ipv4_addr": "192.168.121.69",
            "name": "eth0"
          },
          "eth1": {
            "ipv4_addr": "172.28.128.101",
            "name": "eth1"
          },
          "eth2": {
            "ipv4_addr": "172.29.128.101",
            "name": "eth2"
          }
        },
        "devices": [{
          "name": "/dev/vda1",
          "type": "part",
          "size_mb": 1
        }],
        "role": "low-perf-node",
        "os": {
        },
        "mounts": [ ]
      },
      {
        "hostname": "node-3-with-a-long-name",
        "interfaces": {
          "eth0": {
            "ipv4_addr": "192.168.121.69",
            "name": "eth0"
          },
          "eth1": {
            "ipv4_addr": "172.28.128.101",
            "name": "eth1"
          },
          "eth2": {
            "ipv4_addr": "172.29.128.101",
            "name": "eth2"
          }
        },
        "devices": [{
          "name": "/dev/vda1",
          "type": "part",
          "size_mb": 1
        }],
        "role": "low-perf-node",
        "os": {
        },
        "mounts": [ ]
      }
    ]
    }
  ),
}
