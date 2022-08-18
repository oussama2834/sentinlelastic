import { uiModules } from 'ui/modules';
import routes from 'ui/routes';
import { assign } from 'lodash';

import './services/wizard_helper';
import './services/watcher_wizard_es_service';
import './components/threshold_watcher_wizard';
import './components/title_panel_watcher_wizard';
import './components/title_panel_watcher_wizard/components/watcher_wizard_human_schedule';
import './components/title_panel_watcher_wizard/components/watcher_wizard_every_schedule';
import './components/title_panel_watcher_wizard/components/watcher_wizard_add_index';
import './components/condition_panel_watcher_wizard';
import './components/condition_panel_watcher_wizard/services/watcher_wizard_chart_service';
import './components/condition_panel_watcher_wizard/components/wizard_condition_panel_expression';
import './components/action_panel_watcher_wizard';
import './components/action_panel_watcher_wizard/components/watcher_wizard_add_action';
import './components/action_panel_watcher_wizard/components/watcher_wizard_email_action';
import './components/action_panel_watcher_wizard/components/watcher_wizard_email_html_action';
import './components/action_panel_watcher_wizard/components/watcher_wizard_report_action';
import './components/action_panel_watcher_wizard/components/watcher_wizard_console_action';
import './components/action_panel_watcher_wizard/components/watcher_wizard_webhook_action';
import './components/action_panel_watcher_wizard/components/watcher_wizard_slack_action';
import './components/action_panel_watcher_wizard/components/watcher_wizard_ses_action';
import './components/action_panel_watcher_wizard/components/watcher_wizard_elastic_action';
import './components/impersonation_panel_watcher_wizard';
import './components/input_advanced_panel_watcher_wizard';

import template from './watcher_wizard.html';
import controller from './watcher_wizard';
import { toastNotificationsFactory } from '../../factories';


const toastNotifications = toastNotificationsFactory();


routes
  .when('/watcher/:id/wizard')
  .when('/watcher/:type/new')
  .defaults(/watcher\/(:id\/wizard|:type\/new)/, {
    template,
    controller,
    controllerAs: 'watcherWizard',
    bindToController: true,
    resolve: {
      watcher: function ($route, kbnUrl, sentinlConfig, watcherService) {
        const toastNotifications = toastNotificationsFactory();
        const watcherId = $route.current.params.id;

        let spyBtnWatcher;
        try {
          if (window.localStorage.sentinl_saved_query && !!window.localStorage.sentinl_saved_query.length) {
            spyBtnWatcher = JSON.parse(window.localStorage.sentinl_saved_query);
            delete window.localStorage.sentinl_saved_query;
          }
        } catch (err) {
          toastNotifications.addDanger(`parse spy button watcher: ${err.toString()}`);
          kbnUrl.redirect('/');
        }

        if (!watcherId) {
          return watcherService.new('wizard').then(function (watcher) {
            if (spyBtnWatcher) {
              assign(watcher, spyBtnWatcher);
            }
            return watcher;
          }).catch(function (err) {
            toastNotifications.addDanger(`create new watcher: ${err.toString()}`);
            kbnUrl.redirect('/');
          });
        }

        return watcherService.get(watcherId).then(function (watcher) {
          watcher._edit = true;
          return watcher;
        }).catch(function (err) {
          toastNotifications.addDanger(`get watcher: ${err.toString()}`);
          kbnUrl.redirect('/');
        });
      },
    },
  });
