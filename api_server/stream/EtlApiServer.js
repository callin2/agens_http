var Chunk, TaskComponentMeta, _apiHandlerMap, _deployedFlowRepo, _getApiFuncImpl, _makeErrorResponse, _makeSuccessResponse, _sock, _streamRepo, app, aux, baseDir, dataDirectory, destroy, etlSocketApp, fs, fse, handleApiCall, loadSystemPlugin, loadUserdefinedPlugin, makeFlowFunction2, path, pluginDirectory, promisify, tap, toChunk, withErrorBypass, workspaceDirectory;

({aux, tap, toChunk, withErrorBypass} = require('./StreamUtil'));
Chunk = require('./Chunk');

destroy = require('destroy');
fs = require('fs');
fse = require('fs-extra');
path = require('path');
({promisify} = require('util'));



baseDir;

if (process.versions['electron']) {
  ({app} = require('electron'));
  baseDir = path.resolve(app.getPath('appData'), './agens_flow/');
} else {
  baseDir = process.cwd();
}

// /**
// * directory for user defined plugin.
// * all user defined plugin must inside this directory as a subdirectory.
// * @type {string}
// * @private
// */
pluginDirectory = path.resolve(baseDir, './plugins/server');

fse.ensureDirSync(pluginDirectory);

// /**
// * json, csv 등등의 파일을 있어야 하는 디렉토리.
// * a.json 파일을 agens graph에 로드한다고 가정하면 해당 파일을 이 디렉토리에 먼저 복사해야 한다.
// * @type {string}
// */
dataDirectory = path.resolve(baseDir, './data');

fse.ensureDirSync(dataDirectory);

global.etl_dataDirectory = dataDirectory;

// /**
// * json format의 flow 파일이 저장되는 디렉토리.
// * @type {string}
// */
workspaceDirectory = path.resolve(baseDir, './workspace');

fse.ensureDirSync(workspaceDirectory);

// /**
// * websocket for global message broadcasting
// * @type {socket}
// * @private
// */
_sock = null;

// // plugin 에서 error 처리를 제대로 하지 않은경우 uncaughtException 이 발생한다.
// // 프로그램이 죽으면 안되므로 여기서 에러를 처리함.
process.on('uncaughtException', (err) => {
  var c;
  console.error('uncaughtException', err);
  if (_sock) {
    c = new Chunk({
      error: err.toString(),
      meta: {
        debug: true
      }
    }, 'unkown flow');
    return _sock.emit('etlProgress', c);
  }
});

// //=================================================================
// /**
// * 웹소켓 url에 대응하는 핸들러 function을 저장한다.
// * @type {{}}
// * @private
// */
_apiHandlerMap = {};

// /**
// *
// * @type {{}}
// * @private
// */
_streamRepo = {};

// /**
// * 서버에서 동작중인 Flow 의 id 와 instance의 맵핑정보
// * @type {{}}
// * @private
// */
_deployedFlowRepo = {};

// /**
// * Task(source,transform)의 메타정보를 저장하고있는 배열
// * @type {Array}
// */
TaskComponentMeta = [];

// //=================================================================

// /**
// * agens etl 에서 미리 정의해 놓은 system stream plugin을 로딩한다.
// * @param {array} compMeta plugin의 meta정보를 저장하는 저장소.
// * @param {object} $repo plugin의 factory function을 저장하는 저장소.
// * @return {void}
// */
loadSystemPlugin = function(compMeta, $repo) {
  var sysPlugin;
  sysPlugin = require('./stream/StreamUtil');
  return Object.keys(sysPlugin).filter((k) => {
    return sysPlugin[k]._meta;
  }).forEach((k) => {
    $repo[k] = sysPlugin[k];
    return compMeta.push(sysPlugin[k]._meta);
  });
};

// /**
// * pluginDirectory 에 등록된 사용자 정의 플러그인을 로드한다.
// * @param {array} compMeta plugin의 meta정보를 저장하는 저장소.
// * @param {object} $repo plugin의 factory function을 저장하는 저장소.
// * @returns {*|Promise<T | never>} 디렏토리에서 플로그인을 로딩하는 작업이 비동기 작업이라 promise를 리턴한다.
// */
loadUserdefinedPlugin = function(compMeta, $repo) {
  var global_require_fnc;
  global_require_fnc = global['require'];
  return promisify(fs.readdir)(pluginDirectory).then((files) => {
    files.forEach((f) => {
      var aPlugin, oldPluginIdx;
      if (!fs.statSync(path.resolve(pluginDirectory, f)).isDirectory()) {
        return;
      }
      // require 의 cache에서 기존에 로딩된 plugin 을 제거
      delete global_require_fnc.cache[global_require_fnc.resolve(path.resolve(pluginDirectory, f))];
      // plugin 을 로딩
      aPlugin = global_require_fnc(path.resolve(pluginDirectory, f))({Chunk, withErrorBypass}); // Chunk 말고도 factory function에 필수요소를 추가해야함

      // plugin repository 와 meta 정보를 update
      oldPluginIdx = compMeta.findIndex((m) => {
        return m.name === aPlugin._meta.name;
      });
      if (oldPluginIdx < 0) {
        compMeta.push(aPlugin._meta);
      } else {
        compMeta[oldPluginIdx] = aPlugin._meta;
      }
      return $repo[aPlugin._meta.name] = aPlugin;
    });
    return compMeta;
  }).catch((err) => {
    return console.error(err);
  });
};

// 시스템 플러그인(TaskComponent)을 먼저 로드하고 사용자가 만든 플러그인(TaskComponent)를 나중에 로딩한다.
// 사용자가 만든 플러그인이 시스템 플러그인과 같은 이름을 가지고 있는경우 사용자 플러그인이 등록된다.
// 다시말해 시스템 플러그인을 재정의 할 수 있다.
loadSystemPlugin(TaskComponentMeta, _streamRepo);

loadUserdefinedPlugin(TaskComponentMeta, _streamRepo);

_apiHandlerMap['getComponentList'] = () => {
  return loadUserdefinedPlugin(TaskComponentMeta, _streamRepo);
};

_apiHandlerMap['getSystemFolderInfo'] = () => {
  return {pluginDirectory, dataDirectory, workspaceDirectory};
};

_apiHandlerMap['deployFlow'] = (taskInfo) => {
  var ti;
  ti = _deployedFlowRepo[taskInfo.source.id];
  if (ti) {
    throw new Error(`이미 동작중입니다. {flowId : ${taskInfo.source.id}}`);
  }
  return makeFlowFunction2(taskInfo);
};

_apiHandlerMap['stopFlow'] = (flowId) => {
  var taskInfo;
  taskInfo = _deployedFlowRepo[flowId];
  if (!taskInfo) {
    throw new Error('flowId: ' + flowId + ' 를 찾을 수 없습니다. \n 이미 종료된 flow 이거나 서버가 초기화되었을 수 있습니다.');
  }
  taskInfo.srcStream.destroy();
  destroy(taskInfo.srcStream);
  delete _deployedFlowRepo[flowId];
  return {
    ok: 'ok'
  };
};

_apiHandlerMap['saveWorkspace'] = ({streamGraph, name}) => {
  return promisify(fs.writeFile)(path.resolve(workspaceDirectory, `${name}.json`), JSON.stringify(streamGraph)).then(() => {
    return {
      ok: 'ok'
    };
  });
};

_apiHandlerMap['loadWorkspace'] = (workspaceName = 'cwg') => {
  return promisify(fs.readFile)(path.resolve(workspaceDirectory, `${workspaceName}.json`), 'utf8').then((buffer) => {
    return JSON.parse(buffer.toString());
  }).catch(() => {
    return {
      nodes: [],
      edges: []
    };
  });
};

_apiHandlerMap['getApiList'] = () => {
  return Object.keys(_apiHandlerMap);
};

// /**
// * client 에서 요청한 정보로 스트림들을 생성하여 서로 연결한다.
// * @param {Object} flowInfo
// * @returns {Object}
// */
makeFlowFunction2 = function(flowInfo) {
  var opt, srcStream, srcStreamFactory, ts;
  opt = Object.assign({}, flowInfo.source.option, {
    onError: (err) => {
      console.error(err);
      throw err;
    }
  });
  srcStreamFactory = _streamRepo[flowInfo.source.component];
  srcStream = srcStreamFactory(opt);
  srcStream = srcStream.pipe(toChunk(flowInfo.source.id));
  flowInfo.pipes.forEach((p) => {
    var transform;
    transform = _streamRepo[p.component](p.option);
    return srcStream = srcStream.pipe(transform);
  });
  ts = Date.now();
  srcStream = srcStream.pipe(tap((d) => {
    //동작중인 flow중에서 debug가 표시된것만 내려 보낸다.
    if (d.meta.debug && _deployedFlowRepo[d.meta.flowId]) {
      return _sock.emit('etlProgress', d);
    }
  })).pipe(aux(), {
    end: true
  }).on('finish', () => {
    var apiFunc, c, dur;
    apiFunc = _getApiFuncImpl('stopFlow');
    apiFunc(flowInfo.source.id);
    if (_sock) {
      dur = Date.now() - ts;
      c = new Chunk({
        data: `${dur}ms 걸렸습니다.`,
        meta: {
          debug: true,
          stop: true
        }
      }, flowInfo.source.id);
      return _sock.emit('etlProgress', c);
    }
  });
  _deployedFlowRepo[flowInfo.source.id] = {
    taskInfo: flowInfo,
    srcStream: srcStream
  };
  return {
    flowId: flowInfo.source.id
  };
};

_getApiFuncImpl = function(apiName) {
  var apiFunc;
  apiFunc = _apiHandlerMap[apiName];
  if (!apiFunc) {
    throw new Error('api not found! ' + apiName);
  }
  return apiFunc;
};

// /**
// * 클라이언트의 요청을 처리하는 main logic
// * @param socket
// * @returns {Function}
// */
handleApiCall = function(socket) {
  return (reqObj) => {
    // api 이름으로 api 구현을 찾는다
    return Promise.resolve().then(() => {
      var apiFunc;
      apiFunc = _getApiFuncImpl(reqObj.apiName);
      return apiFunc(reqObj.param, socket);
    }).then((apiResult) => {
      return socket.emit('apiCallback', _makeSuccessResponse(reqObj, apiResult));
    }).catch((err) => {
      return socket.emit('apiCallback', _makeErrorResponse(reqObj, err));
    });
  };
};

_makeSuccessResponse = function(reqObj, apiResult) {
  return {
    req: reqObj,
    status: 'success',
    result: apiResult
  };
};

_makeErrorResponse = function(reqObj, err) {
  if (err instanceof Error) {
    return {
      req: reqObj,
      status: 'error',
      result: '' + err.message + '\n' + err.stack
    };
  } else {
    return {
      req: reqObj,
      status: 'error',
      result: err
    };
  }
};

etlSocketApp = function(socket) {
  _sock = socket;
  return socket.on('apiCall', handleApiCall(socket));
};

module.exports = function(io) {
  return io.of('/etl').on('connection', etlSocketApp);
};
