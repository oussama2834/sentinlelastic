### What is SENTINL?
SENTINL is an App Plugin that works with Kibana or the Siren Platform providing dynamic Alerting and Reporting functionality

> “Designed to monitor, validate and inform users and systems on data series changes using
> standard or join queries, programmable result validators, transformers and templates to
> send out notifications using a variety of configurable actions reaching users, interfacing with
> remote APIs for data and commands, generating new Elasticsearch documents, arbitrary
> metrics towards any other platform, planting triggers for itself to use and so much more. “

### INTRO TO SENTINL
**SENTINL** provides Alerting & Reporting functionality directly within the Siren Platform or Kibana in form of a powerful plugin, leveraging all available native features such as secure client for queries and extending the UI with tools for managing configuration, scheduling and handling executions of user Alerts and Reports.

**SENTINL** is also transparent to the Elasticsearch cluster(s) it monitors, appearing as a
regular client and requiring no complex installation or restarts.

Powered by the many I/O modules the Node.JS community offers, SENTINL usage is not
limited to Elasticsearch and its capabilities can easily be extended to fully interface with
third party data sources and platforms for ingress and egress data.

This is particularly true when used together with the Siren Platform as it will be able
to use the JDBC virtualizations capabilities and the join capabilities across indexes (Elasticsearch or Virtualized)

### WHAT IS A WATCHER?

**SENTINL** allows automation of recurring “questions” (as queries) by using Watchers.

Some Examples for illustration:

* HIT COUNT PER HOUR
  * QUESTION: How many hits does index X receive hourly?
  * WATCHER: query index and return count of hits in last hour
  * ACTION: Notify with number of Hits per hour

* METRIC THRESHOLDS
  * QUESTION: Is any of my monitored metrics surpassing a certain value?
  * WATCHER: query index and type for specific values, aggregated by an arbitrary field.
  * ACTION: Notify with aggs bucket details every time a threshold is surpassed or spike anomaly detected.

* BLACKLISTS HITS
  * QUESTION: Is any of my users trying to reach blacklisted destinations?
  * WATCHER: query firewall logs comparing destination IPs to a blacklist.
  * ACTION: Notify admin via email if any IP >= 10 matches returned

* FAILED LOGINS
  * QUESTION: Are there recurring failure attempts authenticating users on my network?
  * WATCHER: query active directory logs for login failures in last hour and compare to user index. .
  * ACTION: Notify admin via webhook if >= 10 matches returned

* LEAK DETECTION (chain)
  * QUESTION: Are there any public leaks about my data I was not aware of?
  * WATCHER: query for user emails included in published leaks ingested from third parties.
  * ACTION: Save hits in secondary result Index. Notify via email if leak was not known in a secondary Watcher

--------
