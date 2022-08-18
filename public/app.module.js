/* global angular */
import { uiModules } from 'ui/modules';
import 'bootstrap/dist/js/bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import '@elastic/eui/dist/eui_theme_light.css';
import 'angular-touch';
import 'angular-ui-bootstrap';
import 'chart.js';
import 'angular-chart.js';
import Filters from './filters';
import Pages from './pages';
import { AngularServices } from './services';
import Directives from './directives';
import Components from './components';

import './constants';
import './components/ui_code_editor';

const app = uiModules.get('apps/sentinl', [
  'ui.bootstrap',
  'chart.js',
  Filters.name,
  Pages.name,
  AngularServices.name,
  Directives.name,
  Components.name,
]);

app.config(function (ChartJsProvider, $compileProvider) {
  'ngInject';
  // Configure all charts
  ChartJsProvider.setOptions({
    chartColors: ['#0074D9', '#FF4136'],
    responsive: true,
  });

  $compileProvider.aHrefSanitizationWhitelist(/^\s*(blob|http|https):/);
});

export { app };
