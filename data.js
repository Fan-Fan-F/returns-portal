// 演示订单数据（原创虚构）
const MOCK_ORDERS = {
  "SP2026102883": {
    no: "SP2026102883",
    date: "2026-10-28",
    buyer: "张*明",
    items: [
      { id: "i1", name: "降噪头戴耳机", spec: "曜石黑", price: 599, qty: 1, emoji: "🎧", hue: 230 },
      { id: "i2", name: "极简陶瓷马克杯", spec: "月白 350ml", price: 49, qty: 2, emoji: "☕", hue: 15 },
    ],
  },
  "SP2026110512": {
    no: "SP2026110512",
    date: "2026-11-05",
    buyer: "李*华",
    items: [
      { id: "i3", name: "机械键盘 87 键", spec: "红轴 三模", price: 329, qty: 1, emoji: "⌨️", hue: 250 },
      { id: "i4", name: "加厚瑜伽垫 8mm", spec: "雾紫", price: 99, qty: 1, emoji: "🧘", hue: 280 },
      { id: "i5", name: "速干运动毛巾", spec: "灰色", price: 39, qty: 3, emoji: "🏃", hue: 190 },
    ],
  },
  "SP2026111247": {
    no: "SP2026111247",
    date: "2026-11-12",
    buyer: "王*芳",
    items: [
      { id: "i6", name: "铸铁珐琅锅 24cm", spec: "樱桃红", price: 459, qty: 1, emoji: "🍲", hue: 350 },
    ],
  },
};

// 退货原因
const RETURN_REASONS = [
  "商品质量问题（破损/瑕疵）",
  "商品与描述不符",
  "尺寸/尺码不合适",
  "颜色/款式不喜欢",
  "多拍/拍错",
  "未按约定时间发货",
  "其他原因",
];

// 售后状态机
const RMA_FLOW = [
  { key: "applied",   label: "提交申请", desc: "等待商家审核" },
  { key: "approved",  label: "审核通过", desc: "请在 7 天内寄回商品" },
  { key: "shipped",   label: "已寄回",   desc: "商家待收货" },
  { key: "received",  label: "商家已收货", desc: "验收中" },
  { key: "refunded",  label: "退款完成", desc: "款项原路退回" },
];
// 审核不通过的分支
const RMA_REJECTED = { key: "rejected", label: "审核拒绝", desc: "请联系客服申诉" };
