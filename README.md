Agens http
==========

Unofficial http client.

## Install

```shell
$ git clone https://github.com/callin2/agens_http.git
$ cd agens_http
$ npm install
```


## Configuration
- edit `api_server/dbinfo.js.sample` and save as `api_server/dbinfo.js`



## Run
- npm start --prefix ./api_server


## Api Document
there is only one api end point `http://<host>:<port>/:database/:graphpath?`
`graphpath` is optional.
you can find example request in the `test` directory 


## For docker user
if your system can use docker then there is no need to install agens graph.
just type `docker-compose up` then you can get all you want!

