// Generated by CoffeeScript 2.3.1
// Chunk
// =====

// Chunk는 Agens Flow 의 스트림을 지나가는 기본 데이타 구조이다.
// `data`, `error`, `meta`, `control` 네개의 속성을 가지고 있다.
// - `data` 는 `source`에서 읽어들인 값이다.
// - `error`는 스트림 처리중 발생한 에러정보가 들어있다. 정상적인경우 `undefined` 이다.
// - `meta`는 Chunk가 언제 생성되었는지. 어느 flow 에서 생성되었는지 debug 대상인지 여부등등을 정보로 가지고 있다. 또한 control 속성으로 처리요청을
// 받았을때 처리의 결과를 `meta`에 실어 보낸다.
//     - `meta.debug` debug console에 표시할지여부
//     - `meta.flowId` debug 해당 Chunk를 생성한 flowId
//     - `meta.ts` debug 해당 Chunk를 생성한 시각
// - `control`은 스트림이 소비하는 data 이다. 실시간으로 스트림의 설정을 변경하거나 추가적인 정보를 스트림간에 할 일이 있으경우 사용하는 속성이다.

// flow를 이루는 각 stream 들은 넘겨받은 chunk의 error 속성이 있는경우 아무 처리를 하지 않고 bypass 한다.
// data 가 있을경우 처리후 그 결과를 다시 data속성에 실어 보낸다.
// control 의 경우 Pipeline의 각 Stream에서 control 정보를 확인하고 자기 자신의 제어요청인 경우 제어작업을 수행하고 결과를 meta 에 실어보낸다.
// meta 에는 해당 chunk를 디버그화면에서 보여줄지, 에러 파일에 기록할지 control의 처리결과등등의 정보를 가지고 client까지 내려간다.
var Chunk;

module.exports = Chunk = class Chunk {
  constructor({control, data, error, meta}, flowId) {
    this.control = control;
    this.data = data;
    this.error = error;
    this.meta = meta;
    if (this.meta == null) {
      this.meta = {};
    }
    this.meta.ts = Date.now();
    this.meta.flowId = flowId;
    if (this.error) {
      this.meta.debug = true;
    }
  }

  // **mutate** chunk data by  `fn` function
  map(fn) {
    var e;
    if (!this.error && !this.control) {
      try {
        this.data = fn(this.data);
      } catch (error) {
        e = error;
        this.error = e;
      }
    }
    return this;
  }

};