/* global angular */

import './condition_panel_watcher_wizard.less';
import template from './condition_panel_watcher_wizard.html';

import moment from 'moment';
import { omit, isEqual, assign, filter, get, forEach, size, has, pick, isEmpty } from 'lodash';
import WatcherWizardQueryBuilder from './classes/watcher_wizard_query_builder';
import WatcherWizardConditionBuilder from './classes/watcher_wizard_condition_builder';
import { SentinlError } from '../../../../services';

class Chart {
  constructor({name = 'all docs', enabled = true, message = '', xAxis = [], yAxis = [[], []], options} = {}) {
    this.name = name;
    this.enabled = enabled;
    this.message = message;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.options = options || {
      title: {
        display: false,
        text: 'Historical results chart',
      },
    };
  }
}

class ConditionPanelWatcherWizard {
  constructor($http, $scope, watcherWizardChartService, sentinlLog, wizardHelper, sentinlHelper, $timeout) {
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.watcher = this.watcher || this.$scope.watcher;
    this.onQueryChange = this.onQueryChange || this.$scope.onQueryChange;
    this.onConditionChange = this.onConditionChange || this.$scope.onConditionChange;
    this.indexesData = this.indexesData || this.$scope.indexesData;
    this.turnIntoAdvanced = this.turnIntoAdvanced || this.$scope.turnIntoAdvanced;
    this.errorMessage = this.errorMessage || this.$scope.errorMessage;

    this.$http = $http;
    this.watcherWizardChartService = watcherWizardChartService;
    this.wizardHelper = wizardHelper;
    this.sentinlHelper = sentinlHelper;
    this.log = sentinlLog;

    this.locationName = 'ConditionPanelWatcherWizard';
    this.log.initLocation(this.locationName);

    this.messages = {
      nodata: 'The selected index or condition do not return any data!',
    };

    this.progress = {
      running: false,
      message: 'LOADING DATA ...',
    };

    this.charts = [];
    this.chartQuery;

    this.queryTypes = {
      count: {},
      metric: ['average', 'min', 'max', 'sum'],
    };

    this.conditionExpression = {
      handleChartParamsChange: (params) => {
        if (params.queryType === 'count') {
          delete params.field;
          delete this.watcher.wizard.chart_query_params.field;
        }

        if (params.over.type === 'all docs') {
          this.watcher.wizard.chart_query_params.over = { type: params.over.type };
        }

        this.$timeout(() => {
          assign(this.watcher.wizard.chart_query_params, params);
        });
      }
    };

    this.rawDoc = {
      watcher: {
        show: false,
        text: angular.toJson(this.sentinlHelper.pickWatcherSource(this.watcher), true),
        toggle: () => {
          this.rawDoc.watcher.show = !this.rawDoc.watcher.show;
        },
      },
      chart: {
        show: false,
        text: '{\n"message": "This feaature is under construction. Comming soon ..."\n}',
        toggle: () => {
          this.rawDoc.chart.show = !this.rawDoc.chart.show;
        },
      },
    };

    this._init();
  }

  async _init() {
    this.queryBuilder = new WatcherWizardQueryBuilder({timezoneName: this.watcher.wizard.chart_query_params.timezoneName});
    this.conditionBuilder = new WatcherWizardConditionBuilder();

    this.$scope.$watch('conditionPanelWatcherWizard.watcher.wizard', async () => {
      if (this.wizardHelper.isWizardWatcher(this.watcher)) {
        if (this._areChartQueryParamsValid()) {
          try {
            await this._fetchChartData();
          } catch (err) {
            this.errorMessage('watch fetch chart data', err);
          }
        }
      }
    }, true);

    this.$scope.$watch('conditionPanelWatcherWizard.watcher', () => {
      if (this.wizardHelper.isWizardWatcher(this.watcher)) {
        try {
          this._updateWatcherRawDoc(this.watcher);
          this._updateChartRawDoc(this.chartQuery);
        } catch (err) {
          this.errorMessage('watch update raw documents', err);
        }
      }
    }, true);

    this.$scope.$watch('conditionPanelWatcherWizard.indexesData.fieldNames.text', () => {
      this._selectChartQueryParamsOverField();
    });

    this.$scope.$watch('conditionPanelWatcherWizard.indexesData.fieldNames.numeric', () => {
      this._selectChartQueryParamsNumericField();
    });

    this.$scope.$watch('conditionPanelWatcherWizard.indexesData.fieldNames.date', () => {
      this._selectChartQueryParamsDateField();
    });
  }

  _selectChartQueryParamsOverField() {
    if (this.watcher.wizard.chart_query_params.over.type === 'top'
      && this.indexesData.fieldNames.text.length
      && !this.indexesData.fieldNames.text.includes(this.watcher.wizard.chart_query_params.over.field)) {
      this.watcher.wizard.chart_query_params.over.field = this.indexesData.fieldnames.text[0];
    }
  }

  _selectChartQueryParamsNumericField() {
    if (this.watcher.wizard.chart_query_params.queryType !== 'count'
      && this.indexesData.fieldNames.numeric.length
      && !this.indexesData.fieldNames.numeric.includes(this.watcher.wizard.chart_query_params.field)) {
      this.watcher.wizard.chart_query_params.field = this.indexesData.fieldNames.numeric[0];
    }
  }

  _selectChartQueryParamsDateField() {
    if (this.indexesData.fieldNames.numeric.length
      && !this.indexesData.fieldNames.date.includes(this.watcher.wizard.chart_query_params.timeField)) {
      this.watcher.wizard.chart_query_params.timeField = this.indexesData.fieldNames.date[0];
    }
  }

  _areChartQueryParamsValid() {
    const params = this.watcher.wizard.chart_query_params;
    if (params.over.type === 'top' && isEmpty(params.over.field)) {
      return false;
    }
    return params.timeField && this.queryTypes.metric.includes(params.queryType) === has(params, 'field');
  }

  _updateWatcherRawDoc(watcher) {
    this.rawDoc.watcher.text = angular.toJson(this.sentinlHelper.pickWatcherSource(watcher), true);
  }

  _updateChartRawDoc(chartQuery) {
    this.rawDoc.chart.text = JSON.stringify(chartQuery, null, 2);
  }

  get activeChart() {
    return this.charts.find((chart) => chart.enabled === true);
  }

  get isAnyActiveChart() {
    return !!this.charts.find((chart) => chart.enabled === true);
  }

  get areMultipleCharts() {
    return this.charts.length > 1;
  }

  _activeChartIndex() {
    return this.charts.findIndex((e) => e.enabled === true);
  }

  _offChartBatch(indicesToExclude = []) {
    this.charts.forEach((chart, i) => {
      if (!indicesToExclude.includes(i)) {
        this._offChart(chart);
      }
    });
  }

  switchToLeftChart() {
    let index = this._activeChartIndex();
    if (index > 0) {
      index -= 1;
      this._offChartBatch([index]);
      this._onChart(this.charts[index]);
    }
  }

  switchToRightChart() {
    let index = this._activeChartIndex();
    if (index < size(this.charts) - 1) {
      index += 1;
      this._offChartBatch([index]);
      this._onChart(this.charts[index]);
    }
  }

  _buildInputQuery({ over, last, interval, field, queryType, timeField }) {
    let body;
    switch (queryType) {
      case 'average':
        body = this.queryBuilder.average({ over, last, interval, field, timeField });
        this.onQueryChange({ body });
        break;
      case 'sum':
        body = this.queryBuilder.sum({ over, last, interval, field, timeField });
        this.onQueryChange({ body });
        break;
      case 'min':
        body = this.queryBuilder.min({ over, last, interval, field, timeField });
        this.onQueryChange({ body });
        break;
      case 'max':
        body = this.queryBuilder.max({ over, last, interval, field, timeField });
        this.onQueryChange({ body });
        break;
      case 'count':
        body = this.queryBuilder.count({ over, last, interval, field, timeField });
        this.onQueryChange({ body });
        break;
      default:
        throw new SentinlError('build query', new Error('unknown query type'));
    }
  }

  _buildCondition({ over, threshold, queryType }) {
    let condition;
    switch (queryType) {
      case 'average':
        condition = this.conditionBuilder.average({ over, threshold });
        this.onConditionChange({ condition });
        break;
      case 'sum':
        condition = this.conditionBuilder.sum({ over, threshold });
        this.onConditionChange({ condition });
        break;
      case 'min':
        condition = this.conditionBuilder.min({ over, threshold });
        this.onConditionChange({ condition });
        break;
      case 'max':
        condition = this.conditionBuilder.max({ over, threshold });
        this.onConditionChange({ condition });
        break;
      case 'count':
        condition = this.conditionBuilder.count({ over, threshold });
        this.onConditionChange({ condition });
        break;
      default:
        throw new SentinlError('build condition', new Error('unknown query type'));
    }
  }

  /*
  * Fetch chart data and fill its X and Y axises
  */
  async _fetchChartData() {
    const params = pick(this.watcher.wizard.chart_query_params,
      ['over', 'last', 'interval', 'field', 'threshold', 'queryType', 'timeField']);
    params.index = this.watcher.input.search.request.index;

    if (this._isMetricAgg(params.queryType)) {
      params.metricAggType = params.queryType;
    }

    if (params.metricAggType) {
      try {
        await this._queryMetricAgg(params);
      } catch (err) {
        throw new SentinlError(`query agg type ${params.metricAggType}`, err);
      }
    } else {
      if (get(this.watcher, 'wizard.chart_query_params.queryType') === 'count') {
        try {
          await this._queryCount(params);
        } catch (err) {
          throw new SentinlError('query count', err);
        }
      }
    }

    try {
      this._buildInputQuery(params);
    } catch (err) {
      throw new SentinlError('build input query', err);
    }

    try {
      this._buildCondition(params);
    } catch (err) {
      throw new SentinlError('build condiiton', err);
    }

    return null;
  }

  _isMetricAgg(type) {
    return this.queryTypes.metric.includes(type);
  }

  /*
  * @param {integer} n on y axis
  */
  _drawChartThreshold(chart, n) {
    if (!chart) {
      return;
    }
    const len = chart.yAxis[0].length;
    chart.yAxis[1] = Array.apply(null, Array(len)).map(Number.prototype.valueOf, n);
  }

  _isDateAggData(esResp) {
    return has(esResp, 'data.aggregations.dateAgg.buckets') && !!esResp.data.aggregations.dateAgg.buckets.length;
  }

  _isBucketAggData(esResp) {
    return has(esResp, 'data.aggregations.bucketAgg.buckets') && !!esResp.data.aggregations.bucketAgg.buckets.length;
  }

  /**
  * Get matric aggregation (sum, min, max, average) of field
  */
  async _queryMetricAgg({index, over, last, interval, field, threshold, metricAggType, timeField}) {
    this._onProgress();

    try {
      let resp;
      try {
        if (metricAggType === 'average') {
          this.chartQuery = this.queryBuilder.average({over, last, interval, field, timeField});
          resp = await this.watcherWizardChartService.metricAggAverage({index, query: JSON.stringify(this.chartQuery)});
        } else if (metricAggType === 'sum') {
          this.chartQuery = this.queryBuilder.sum({over, last, interval, field, timeField});
          resp = await this.watcherWizardChartService.metricAggSum({index, query: JSON.stringify(this.chartQuery)});
        } else if (metricAggType === 'min') {
          this.chartQuery = this.queryBuilder.min({over, last, interval, field, timeField});
          resp = await this.watcherWizardChartService.metricAggMin({index, query: JSON.stringify(this.chartQuery)});
        } else if (metricAggType === 'max') {
          this.chartQuery = this.queryBuilder.max({over, last, interval, field, timeField});
          resp = await this.watcherWizardChartService.metricAggMax({index, query: JSON.stringify(this.chartQuery)});
        }
      } catch (err) {
        throw new SentinlError('execute query', err);
      }

      this.charts = [];
      this.log.debug(`${metricAggType} es resp:`, resp);

      try {
        if (this._isDateAggData(resp)) {
          this.charts.push(new Chart());
          this._updateMetricAggChartWithNewData(this.activeChart, resp.data.aggregations, last, threshold);
          this._onChart(this.activeChart);
        } else if (this._isBucketAggData(resp)) {
          resp.data.aggregations.bucketAgg.buckets.forEach((bucket, i) => {
            this.charts.push(new Chart({enabled: false, name: bucket.key}));
            this._updateMetricAggChartWithNewData(this.charts[i], bucket, last, threshold);
          });
          this._onChart(this.charts[0]);
        } else {
          this._offChart(this.activeChart, this.messages.nodata);
        }
      } catch (err) {
        throw new SentinlError('update chart data', err);
      }
    } catch (err) {
      this._offChart(this.activeChart, this.messages.nodata);
      this._offProgress();
      throw new SentinlError('query metric agg', err);
    }
    this._offProgress();
    return null;
  }

  /**
  * Count documents
  */
  async _queryCount({ index, over, last, interval, field, threshold, timeField }) {
    this._onProgress();

    try {
      let resp;
      try {
        this.chartQuery = this.queryBuilder.count({over, last, interval, field, timeField});
        resp = await this.watcherWizardChartService.count({index, query: JSON.stringify(this.chartQuery)});
      } catch (err) {
        throw new SentinlError('execute query', err);
      }

      this.charts = [];
      this.log.debug('count es resp:', resp);

      try {
        if (this._isDateAggData(resp)) {
          this.charts.push(new Chart());
          this._updateCountChartWithNewData(this.activeChart, resp.data.aggregations, last, threshold);
          this._onChart(this.activeChart);
        } else if (this._isBucketAggData(resp)) {
          resp.data.aggregations.bucketAgg.buckets.forEach((bucket, i) => {
            this.charts.push(new Chart({enabled: false, name: bucket.key}));
            this._updateCountChartWithNewData(this.charts[i], bucket, last, threshold);
          });
          this._onChart(this.charts[0]);
        } else {
          this._offChart(this.activeChart, this.messages.nodata);
        }
      } catch (err) {
        throw new SentinlError('update chart data', err);
      }
    } catch (err) {
      this._offChart(this.activeChart, this.messages.nodata);
      this._offProgress();
      throw new SentinlError('query count', err);
    }
    this._offProgress();
    return null;
  }

  _updateCountChartWithNewData(chart, aggs, last, threshold) {
    this._purgeChartData(chart);
    this._updateChartAxisesForCount(chart, aggs, last.unit);
    this._drawChartThreshold(chart, threshold.n);
  }

  _updateMetricAggChartWithNewData(chart, aggs, last, threshold) {
    this._purgeChartData(chart);
    this._updateChartAxisesForMetricAgg(chart, aggs, last.unit);
    this._drawChartThreshold(chart, threshold.n);
  }

  _onProgress(chart, msg) {
    this.progress.message = msg || 'LOADING DATA ...';
    this.progress.running = true;
  }

  _offProgress(chart, msg) {
    this.progress.message = msg || '';
    this.progress.running = false;
  }

  _onChart(chart, msg) {
    if (chart) {
      setTimeout(() => {
        this.$scope.$apply(() => {
          chart.message = msg || '';
          chart.enabled = true;
        });
      });
    }
  }

  _offChart(chart, msg) {
    if (chart) {
      setTimeout(() => {
        this.$scope.$apply(() => {
          chart.message = msg || '';
          chart.enabled = false;
        });
      });
    }
  }

  _updateChartAxisesForCount(chart, aggregations, unit) {
    aggregations.dateAgg.buckets.forEach((bucket) => {
      chart.xAxis.push(this._formatTimeForXAxis(bucket.key, unit));
      chart.yAxis[0].push(bucket.doc_count);
    });
  }

  _updateChartAxisesForMetricAgg(chart, aggregations, unit) {
    aggregations.dateAgg.buckets.forEach((bucket) => {
      chart.xAxis.push(this._formatTimeForXAxis(bucket.key, unit));
      chart.yAxis[0].push(bucket.metricAgg.value);
    });
  }

  _purgeChartData(chart) {
    chart.xAxis = [];
    chart.yAxis[0] = [];
  }

  _purgeAllCharts() {
    this.charts = [];
  }

  /*
  * @return {string} formatted time - April 18, 2018 4:58 PM
  */
  _formatTimeForXAxis(epochTime, unit) {
    let locale = 'LLL';
    if (unit === 'seconds') {
      locale = 'LTS';
    }
    if (unit === 'minutes' || unit === 'hours') {
      locale = 'LT';
    }
    if (unit === 'days' || unit === 'months' || unit === 'years') {
      locale = 'L';
    }
    return moment(epochTime).format(locale);
  }
}

function conditionPanelWatcherWizard() {
  return {
    template,
    restrict: 'E',
    scope: {
      watcher: '=',
      onQueryChange: '&',
      onConditionChange: '&',
      turnIntoAdvanced: '&',
      indexesData: '=',
      errorMessage: '=',
    },
    controller:  ConditionPanelWatcherWizard,
    controllerAs: 'conditionPanelWatcherWizard',
    bindToController: {
      watcher: '=',
      onQueryChange: '&',
      onConditionChange: '&',
      turnIntoAdvanced: '&',
      indexesData: '=',
      errorMessage: '=',
    },
  };
}

export default conditionPanelWatcherWizard;
