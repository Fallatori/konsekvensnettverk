Must have:
user login page

property for each node:

- id: uuid
- label: short text
- type: categories of [hendelse, samfunnsfunksjon]
- likelihood: available only for hendelse type of node, categories of [ingen, svært lav, lav, middels, høy, svært høy]
- likelihood value:available only for hendelse type of node, for likelihood, MappingMethod1: ingen=0, svært lav=20, lav=40, middels=60, høy=80, svært høy=100.
- consequence: available only for samfunnsfunksjon type of node, categories of [ingen, svært små, små, middels, store, svært store]
- consequence value: available only for samfunnsfunksjon type of node, For consequence, MappingMethod2: ingen=0, svært små=20, små=40, middels=60, store=80, svært store=100
- description: long text
- parental node: list of node ids,
- child node: list of node ids
- connection level with parental node: e.g., node ID 1: 3, mining the connection from parentnode ID1 to this node is strong of 3, number 3 will be used to indicate the width of connection line
- indirect consequence: available only for samfunnsfunksjon type of node, a computed value through ComputeIndirectConsequenceMethod based on timed consequence value of this node and its parental nodes
- indirect consequence value: available only for samfunnsfunksjon type of node, value based on indirect consequence
- timed consequence: available only for samfunnsfunksjon type of node, a computed value through ComputeTimedConsequenceMethod based on consequence value of this node and user-selected timeframe
- timed consequence value: available only for samfunnsfunksjon type of node, value based on indirect consequence
