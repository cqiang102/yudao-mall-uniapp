<template>
  <s-layout title="发票">
    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'record' }" @tap="tab = 'record'">开票记录</view>
      <view class="tab" :class="{ on: tab === 'title' }" @tap="tab = 'title'">抬头管理</view>
    </view>

    <!-- 开票记录 -->
    <view v-if="tab === 'record'" class="pane">
      <view class="apply-btn" @tap="openApply">＋ 申请开票</view>
      <view v-for="i in invoices" :key="i.id" class="inv-card">
        <view class="ir-top">
          <text class="ir-order">{{ i.orderNo }}</text>
          <text class="ir-status" :class="'s' + i.status">{{ ['申请中', '已开票', '已驳回'][i.status] }}</text>
        </view>
        <view class="ir-row"><text class="ir-label">抬头</text><text>{{ i.title }}（{{ i.type === 1 ? '企业' : '个人' }}）</text></view>
        <view class="ir-row" v-if="i.taxNo"><text class="ir-label">税号</text><text>{{ i.taxNo }}</text></view>
        <view class="ir-row"><text class="ir-label">金额</text><text class="ir-amount">¥{{ fen2yuan(i.amount) }}</text></view>
        <view class="ir-reject" v-if="i.status === 2">驳回原因：{{ i.rejectReason }}</view>
      </view>
      <view v-if="!invoices.length" class="empty">暂无开票记录</view>
    </view>

    <!-- 抬头管理 -->
    <view v-if="tab === 'title'" class="pane">
      <view class="apply-btn" @tap="openTitleForm()">＋ 新增抬头</view>
      <view v-for="t in titles" :key="t.id" class="inv-card" @tap="openTitleForm(t)">
        <view class="ir-top">
          <text class="ir-order">{{ t.title }}</text>
          <text class="ir-default" v-if="t.isDefault === 1">默认</text>
        </view>
        <view class="ir-row">
          <text class="ir-label">类型</text><text>{{ t.type === 1 ? '企业单位' : '个人' }}</text>
        </view>
        <view class="ir-row" v-if="t.taxNo"><text class="ir-label">税号</text><text>{{ t.taxNo }}</text></view>
        <view class="title-ops">
          <text class="t-del" @tap.stop="removeTitle(t)">删除</text>
        </view>
      </view>
      <view v-if="!titles.length" class="empty">暂无抬头，点击「新增抬头」添加</view>
    </view>

    <!-- 申请开票弹层 -->
    <view class="mask" v-if="showApply" @tap="showApply = false">
      <view class="popup" @tap.stop>
        <view class="p-title">选择要开票的订单</view>
        <scroll-view scroll-y class="p-scroll">
          <view v-for="o in applyOrders" :key="o.id" class="o-row" :class="{ picked: pickedId === o.id }" @tap="pickedId = o.id">
            <view class="o-line1">
              <text class="o-no">{{ o.orderNo }}</text>
              <text class="o-amount">¥{{ fen2yuan(o.payPrice) }}</text>
            </view>
            <text class="o-time">{{ formatTime(o.createTime) }}</text>
          </view>
          <view v-if="!applyOrders.length" class="empty">暂无可开票订单（需已支付且未开票）</view>
        </scroll-view>
        <view class="p-title" v-if="pickedId">抬头信息</view>
        <view v-if="pickedId && defaultTitle && !customTitle" class="def-title" @tap="customTitle = true">
          使用默认抬头：{{ defaultTitle.title }}（点击可修改）
        </view>
        <view v-if="pickedId && (!defaultTitle || customTitle)" class="t-form">
          <view class="t-row">
            <text>类型</text>
            <radio-group @change="(e) => form.type = Number(e.detail.value)" class="t-radios">
              <label><radio :value="1" :checked="form.type === 1" color="#fa5151" />企业</label>
              <label><radio :value="2" :checked="form.type === 2" color="#fa5151" />个人</label>
            </radio-group>
          </view>
          <input v-model="form.title" class="t-input" placeholder="抬头名称（企业全称或个人姓名）" />
          <input v-if="form.type === 1" v-model="form.taxNo" class="t-input" placeholder="税号（企业必填）" />
        </view>
        <view class="p-btns">
          <view class="p-cancel" @tap="showApply = false">取消</view>
          <view class="p-ok" @tap="doApply">提交申请</view>
        </view>
      </view>
    </view>

    <!-- 抬头表单弹层 -->
    <view class="mask" v-if="showTitleForm" @tap="showTitleForm = false">
      <view class="popup" @tap.stop>
        <view class="p-title">{{ form.id ? '编辑抬头' : '新增抬头' }}</view>
        <view class="t-form">
          <view class="t-row">
            <text>类型</text>
            <radio-group @change="(e) => form.type = Number(e.detail.value)" class="t-radios">
              <label><radio :value="1" :checked="form.type === 1" color="#fa5151" />企业</label>
              <label><radio :value="2" :checked="form.type === 2" color="#fa5151" />个人</label>
            </radio-group>
          </view>
          <input v-model="form.title" class="t-input" placeholder="抬头名称（企业全称或个人姓名）" />
          <input v-if="form.type === 1" v-model="form.taxNo" class="t-input" placeholder="税号（企业必填）" />
          <view class="t-default">
            <text>设为默认</text>
            <switch :checked="form.isDefault === 1" color="#fa5151" @change="(e) => form.isDefault = e.detail.value ? 1 : 0" />
          </view>
        </view>
        <view class="p-btns">
          <view class="p-cancel" @tap="showTitleForm = false">取消</view>
          <view class="p-ok" @tap="doSaveTitle">保 存</view>
        </view>
      </view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import RestaurantInvoiceApi from '@/sheep/api/restaurant/invoice';
import RestaurantOrderApi from '@/sheep/api/restaurant/order';

const tab = ref('record');
const invoices = ref([]);
const titles = ref([]);
const appliedOrderIds = ref([]);

// 申请弹层
const showApply = ref(false);
const applyOrders = ref([]);
const pickedId = ref(null);
const customTitle = ref(false);
const form = reactive({ type: 1, title: '', taxNo: '', isDefault: 0 });

// 抬头表单弹层
const showTitleForm = ref(false);

const defaultTitle = computed(() => titles.value.find((t) => t.isDefault === 1));

function fen2yuan(f) {
  return ((f || 0) / 100).toFixed(2);
}
function formatTime(t) {
  return t ? String(t).replace('T', ' ').slice(0, 16) : '';
}

async function loadAll() {
  const [invRes, titleRes] = await Promise.all([
    RestaurantInvoiceApi.getMyList(),
    RestaurantInvoiceApi.getTitleList(),
  ]);
  if (invRes.code === 0) {
    invoices.value = invRes.data || [];
    appliedOrderIds.value = (invRes.data || []).map((i) => i.orderId);
  }
  if (titleRes.code === 0) titles.value = titleRes.data || [];
}

onShow(() => {
  loadAll();
});

// ========== 申请开票 ==========
async function openApply() {
  pickedId.value = null;
  customTitle.value = false;
  form.type = 1;
  form.title = '';
  form.taxNo = '';
  const res = await RestaurantOrderApi.getOrderPage({ pageNo: 1, pageSize: 50 });
  const all = res.code === 0 ? res.data?.list || [] : [];
  applyOrders.value = all.filter(
    (o) => o.payStatus === 1 && !appliedOrderIds.value.includes(o.id),
  );
  showApply.value = true;
}

async function doApply() {
  if (!pickedId.value) {
    uni.showToast({ title: '请选择订单', icon: 'none' });
    return;
  }
  const useDefault = defaultTitle.value && !customTitle.value;
  const payload = useDefault
    ? { orderId: pickedId.value, titleId: defaultTitle.value.id }
    : { orderId: pickedId.value, type: form.type, title: form.title, taxNo: form.taxNo || null };
  if (!useDefault && !form.title) {
    uni.showToast({ title: '请填写抬头名称', icon: 'none' });
    return;
  }
  if (!useDefault && form.type === 1 && !form.taxNo) {
    uni.showToast({ title: '企业抬头需填写税号', icon: 'none' });
    return;
  }
  const res = await RestaurantInvoiceApi.apply(payload);
  if (res.code === 0) {
    uni.showToast({ title: '已提交申请', icon: 'success' });
    showApply.value = false;
    loadAll();
  }
}

// ========== 抬头管理 ==========
function openTitleForm(t) {
  Object.assign(form, {
    id: t?.id,
    type: t?.type ?? 1,
    title: t?.title || '',
    taxNo: t?.taxNo || '',
    isDefault: t?.isDefault ?? 0,
  });
  showTitleForm.value = true;
}

async function doSaveTitle() {
  if (!form.title) {
    uni.showToast({ title: '请填写抬头名称', icon: 'none' });
    return;
  }
  if (form.type === 1 && !form.taxNo) {
    uni.showToast({ title: '企业抬头需填写税号', icon: 'none' });
    return;
  }
  const res = await RestaurantInvoiceApi.saveTitle({ ...form });
  if (res.code === 0) {
    uni.showToast({ title: '保存成功', icon: 'success' });
    showTitleForm.value = false;
    loadAll();
  }
}

async function removeTitle(t) {
  uni.showModal({
    content: `删除抬头「${t.title}」？`,
    success: async (r2) => {
      if (!r2.confirm) return;
      const res = await RestaurantInvoiceApi.deleteTitle(t.id);
      if (res.code === 0) {
        uni.showToast({ title: '已删除', icon: 'success' });
        loadAll();
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.tabs { display: flex; background: #fff; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #666; border-bottom: 4rpx solid transparent; }
.tab.on { color: #fa5151; border-bottom-color: #fa5151; font-weight: 600; }
.pane { padding: 20rpx; }
.apply-btn { background: #fa5151; color: #fff; text-align: center; border-radius: 40rpx; padding: 18rpx 0; font-size: 28rpx; margin-bottom: 20rpx; }
.inv-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.ir-top { display: flex; align-items: center; margin-bottom: 12rpx; }
.ir-order { flex: 1; font-size: 28rpx; font-weight: 600; }
.ir-status { font-size: 24rpx; }
.ir-status.s0 { color: #ff9500; }
.ir-status.s1 { color: #07c160; }
.ir-status.s2 { color: #999; }
.ir-default { font-size: 20rpx; color: #fa5151; border: 1rpx solid #fa5151; border-radius: 6rpx; padding: 2rpx 10rpx; }
.ir-row { display: flex; font-size: 26rpx; color: #666; margin-top: 8rpx; }
.ir-label { width: 90rpx; color: #999; flex-shrink: 0; }
.ir-amount { color: #fa5151; font-weight: 600; }
.ir-reject { margin-top: 12rpx; font-size: 24rpx; color: #e64340; background: #fdf2f2; border-radius: 8rpx; padding: 12rpx 16rpx; }
.title-ops { margin-top: 12rpx; text-align: right; }
.t-del { font-size: 24rpx; color: #999; }
.empty { text-align: center; color: #999; padding: 80rpx 0; font-size: 26rpx; }
.mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 99; display: flex; align-items: flex-end; }
.popup { width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 80vh; overflow-y: auto; }
.p-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; }
.p-scroll { max-height: 40vh; }
.o-row { padding: 20rpx; border: 1rpx solid #eee; border-radius: 12rpx; margin-bottom: 16rpx; }
.o-row.picked { border-color: #fa5151; background: #fdf2f2; }
.o-line1 { display: flex; justify-content: space-between; font-size: 26rpx; }
.o-no { font-weight: 600; }
.o-amount { color: #fa5151; }
.o-time { font-size: 22rpx; color: #999; }
.def-title { font-size: 26rpx; color: #1a73e8; background: #f0f6ff; border-radius: 8rpx; padding: 16rpx; margin-bottom: 16rpx; }
.t-form { margin-bottom: 10rpx; }
.t-row { display: flex; align-items: center; font-size: 26rpx; color: #666; margin-bottom: 16rpx; }
.t-radios { display: flex; margin-left: 20rpx; gap: 30rpx; }
.t-input { border: 1rpx solid #eee; border-radius: 10rpx; padding: 16rpx; font-size: 26rpx; margin-bottom: 16rpx; }
.t-default { display: flex; align-items: center; justify-content: space-between; font-size: 26rpx; color: #666; }
.p-btns { display: flex; margin-top: 24rpx; }
.p-cancel { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 40rpx; border: 1rpx solid #ddd; font-size: 28rpx; margin-right: 20rpx; }
.p-ok { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 40rpx; background: #fa5151; color: #fff; font-size: 28rpx; }
</style>
