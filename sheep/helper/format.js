/**
 * 公共格式化工具（2026-10-05 新增）
 *
 * 背景：餐饮消费端多个页面各自渲染时间字段，格式不统一——
 *   recharge.vue / member-card.vue 各写了一份本地 formatTime，
 *   而 order-list / point-shop / store-workbench 直接渲染毫秒时间戳
 *   （页面上出现 `1789973271000` 这种）。
 * 芋道后端所有时间字段都序列化为**毫秒时间戳**（LocalDateTime → EpochMillis，
 * 见 YudaoJacksonAutoConfiguration），因此前端展示前必须统一转换。
 *
 * 之后新增页面请直接用这里的 formatTime / formatDate，不要再各写一份。
 */

const pad = (n) => (n < 10 ? '0' + n : '' + n);

/**
 * 归一化时间入参（2026-10-05 补）
 * 后端多数接口返回**数字**毫秒时间戳，但少数接口返回**字符串形式**的（如 user-center
 * 的 summary.lastOrderTime）。`new Date("1789702812000")` 会得到 Invalid Date →
 * formatTime 原样返回 → 页面上出现裸时间戳（实测 bug）。
 * 这里只对「纯数字字符串」做转换，避免把 '2026-10-05' 这类日期字符串误转成数字。
 */
function toDateValue(t) {
  if (typeof t === 'string' && /^\d+$/.test(t.trim())) return Number(t.trim());
  return t;
}

/**
 * 毫秒时间戳 → `YYYY-MM-DD HH:mm`
 * 传空返回 ''；无法解析时原样返回字符串，避免页面出现 "NaN"。
 */
export function formatTime(t) {
  if (t === null || t === undefined || t === '') return '';
  const d = new Date(toDateValue(t));
  if (isNaN(d.getTime())) return String(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 毫秒时间戳 → `YYYY-MM-DD` */
export function formatDate(t) {
  if (t === null || t === undefined || t === '') return '';
  const d = new Date(toDateValue(t));
  if (isNaN(d.getTime())) return String(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default { formatTime, formatDate };
