// 迷你 JSON Schema 校验器 —— 只认工具说明书用到的子集:type object / properties /
// required / items,属性类型 string/number/boolean/array。不引库、不抛异常:
// 错误收进数组,空 = 通过,非空 = 逐条当结果喂回模型,让它自己改参重试
type Schema = { type?: string; properties?: Record<string, Schema>; required?: string[]; items?: Schema };

export function validate(v: unknown, schema: Schema, path = 'args'): string[] {
  const t = schema.type;
  if (t === 'object') {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return [`${path} 应是对象`];
    const obj = v as Record<string, unknown>;
    const errs: string[] = [];
    for (const k of schema.required ?? []) {
      if (!(k in obj)) errs.push(`缺必填参数 ${path}.${k}`); // 只查「在场」,空串也算在场
    }
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      if (k in obj) errs.push(...validate(obj[k], sub, `${path}.${k}`));
    }
    return errs;
  }
  const ok =
    t === 'string' ? typeof v === 'string' :
    t === 'number' ? typeof v === 'number' :
    t === 'boolean' ? typeof v === 'boolean' :
    t === 'array' ? Array.isArray(v) && v.every(x => !schema.items || validate(x, schema.items).length === 0) :
    true; // 没写 type 就不管——校验器只负责说明书明确要的
  return ok ? [] : [`${path} 应是 ${t},来的不是`];
}
