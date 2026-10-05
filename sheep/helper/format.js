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
 * 毫秒时间戳 → `YYYY-MM-DD HH:mm`
 * 传空返回 ''；无法解析时原样返回字符串，避免页面出现 "NaN"。
 */
export function formatTime(t) {
  if (t === null || t === undefined || t === '') return '';
  const d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 毫秒时间戳 → `YYYY-MM-DD` */
export function formatDate(t) {
  if (t === null || t === undefined || t === '') return '';
  const d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default { formatTime, formatDate };
