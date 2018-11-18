// [postgresql Constant Field Values](https://jdbc.postgresql.org/development/privateapi/constant-values.html)
var BIT, BIT_ARRAY, BOOL, BOOL_ARRAY, BOX, BPCHAR, BPCHAR_ARRAY, BYTEA, BYTEA_ARRAY, CHAR, CHAR_ARRAY, DATE, DATE_ARRAY, FLOAT4, FLOAT4_ARRAY, FLOAT8, FLOAT8_ARRAY, INT2, INT2_ARRAY, INT4, INT4_ARRAY, INT8, INT8_ARRAY, INTERVAL, INTERVAL_ARRAY, JSONB_ARRAY, MONEY, MONEY_ARRAY, NAME, NAME_ARRAY, NUMERIC, NUMERIC_ARRAY, OID, OID_ARRAY, POINT, TEXT, TEXT_ARRAY, TIME, TIMESTAMP, TIMESTAMPTZ, TIMESTAMPTZ_ARRAY, TIMESTAMP_ARRAY, TIMETZ, TIMETZ_ARRAY, TIME_ARRAY, UNSPECIFIED, UUID, UUID_ARRAY, VARBIT, VARBIT_ARRAY, VARCHAR, VARCHAR_ARRAY, VOID, XML, XML_ARRAY, param2Type, qw;

BIT = 1560;

BIT_ARRAY = 1561;

BOOL = 16;

BOOL_ARRAY = 1000;

BOX = 603;

BPCHAR = 1042;

BPCHAR_ARRAY = 1014;

BYTEA = 17;

BYTEA_ARRAY = 1001;

CHAR = 18;

CHAR_ARRAY = 1002;

DATE = 1082;

DATE_ARRAY = 1182;

FLOAT4 = 700;

FLOAT4_ARRAY = 1021;

FLOAT8 = 701;

FLOAT8_ARRAY = 1022;

INT2 = 21;

INT2_ARRAY = 1005;

INT4 = 23;

INT4_ARRAY = 1007;

INT8 = 20;

INT8_ARRAY = 1016;

INTERVAL = 1186;

INTERVAL_ARRAY = 1187;

JSONB_ARRAY = 3807;

MONEY = 790;

MONEY_ARRAY = 791;

NAME = 19;

NAME_ARRAY = 1003;

NUMERIC = 1700;

NUMERIC_ARRAY = 1231;

OID = 26;

OID_ARRAY = 1028;

POINT = 600;

TEXT = 25;

TEXT_ARRAY = 1009;

TIME = 1083;

TIME_ARRAY = 1183;

TIMESTAMP = 1114;

TIMESTAMP_ARRAY = 1115;

TIMESTAMPTZ = 1184;

TIMESTAMPTZ_ARRAY = 1185;

TIMETZ = 1266;

TIMETZ_ARRAY = 1270;

UNSPECIFIED = 0;

UUID = 2950;

UUID_ARRAY = 2951;

VARBIT = 1562;

VARBIT_ARRAY = 1563;

VARCHAR = 1043;

VARCHAR_ARRAY = 1015;

VOID = 2278;

XML = 142;

XML_ARRAY = 143;

// 쿼리 파라미터를 참조하여 그에 해당하는 Type 상수를 찾아준다.
// 모든 Type을 유추해서 찾아주지는 못한다. Agens Flow 에서 사용하는 범위만 구현했다.
param2Type = function(param) {
    return param.map(function(p) {
        var tstr;
        tstr = typeof p;

        console.log("ddd", tstr, p)

        switch (tstr) {
            case 'string':
                return TEXT;
                break;
            case 'number':
                if (p % 1 === 0) {
                    return INT4;
                } else {
                    return FLOAT8;
                }
                break;
            case 'boolean':
                return BOOL;
                break;
            case 'object':
                if (p instanceof Array) {
                    return 1000;
                } else {
                    return 3802;
                }
                break;
            default:
                throw new Error('unsupported type.' + p);
        }
    });
};

// node.js용 postgesql driver가 parameter를 매핑하는데 일부Type에서 에러가 발생한다. 그것을 우회하기 위해서
// `query`와  `param` 두개를 입력받아서 types 정보를 지정하는 방식의 쿼리를 만든다.
qw = function(query, param) {
    return {
        // name: 'aa',
        text: query,
        values: param,
        types: param2Type(param)
    };
};

module.exports = {
    qw: qw
};
