<template>
  <s-layout title="收货地址">
    <view class="addr-page">
      <view v-for="a in list" :key="a.id" class="addr-card">
        <view class="addr-main" @tap="onPick(a)">
          <view class="row1">
            <text class="name">{{ a.name }}</text>
            <text class="phone">{{ a.phone }}</text>
            <text v-if="a.defaultStatus === 1" class="tag">默认</text>
          </view>
          <text class="detail">{{ a.region }} {{ a.detail }}</text>
        </view>
        <view class="addr-ops">
          <text class="op set-def" v-if="a.defaultStatus !== 1" @tap.stop="setDefault(a)">设默认</text>
          <text class="op edit" @tap.stop="goEdit(a)">编辑</text>
          <text class="op del" @tap.stop="del(a)">删除</text>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无收货地址，点击下方按钮添加</view>

      <button type="primary" class="add-btn" @tap="goEdit(null)">新增地址</button>
    </view>
  </s-layout>
</template>

<script setup>
import { ref, onLoad, onShow } from 'vue';
import sheep from '@/sheep';
import RestaurantAddressApi from '@/sheep/api/restaurant/address';

const list = ref([]);
// pick=1 时为「外卖下单选地址」模式：点卡片回传上一页
const pickMode = ref(false);

onLoad((options) => {
  pickMode.value = options.pick === '1';
});

onShow(load);

async function load() {
  const res = await RestaurantAddressApi.getMyList();
  if (res.code === 0) list.value = res.data || [];
}

function onPick(a) {
  if (!pickMode.value) return;
  // 通过全局事件把地址回传给下单页（order-confirm uni.$on('address-picked')）
  uni.$emit('address-picked', {
    name: a.name,
    phone: a.phone,
    region: a.region,
    detail: a.detail,
  });
  uni.navigateBack();
}

async function setDefault(a) {
  const res = await RestaurantAddressApi.setDefault(a.id);
  if (res.code === 0) {
    uni.showToast({ title: '已设为默认', icon: 'success' });
    load();
  }
}

function goEdit(a) {
  const params = a ? { id: a.id } : {};
  sheep.$router.go('/pages/restaurant/address-edit', params);
}

// showModal 包装为 Promise，避免回调风格在各端表现不一致
function confirmModal(content) {
  return new Promise((resolve) => {
    uni.showModal({
      title: '提示',
      content,
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    });
  });
}

async function del(a) {
  const ok = await confirmModal('确认删除该地址？');
  if (!ok) return;
  const res = await RestaurantAddressApi.delete(a.id);
  if (res.code === 0) {
    uni.showToast({ title: '已删除', icon: 'success' });
    load();
  }
}
</script>

<style lang="scss" scoped>
.addr-page { padding: 20rpx; }
.addr-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.row1 { display: flex; align-items: center; gap: 16rpx; margin-bottom: 8rpx; }
.name { font-size: 30rpx; font-weight: 600; }
.phone { font-size: 26rpx; color: #666; }
.tag { font-size: 20rpx; color: #fa5151; border: 1rpx solid #fa5151; border-radius: 8rpx; padding: 2rpx 10rpx; }
.detail { font-size: 26rpx; color: #666; line-height: 1.5; }
.addr-ops { display: flex; justify-content: flex-end; gap: 32rpx; margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #f5f5f5; }
.op { font-size: 26rpx; color: #666; }
.op.set-def { color: #fa8c16; }
.op.del { color: #999; }
.empty { text-align: center; color: #999; padding: 120rpx 0; }
.add-btn { margin-top: 40rpx; }
</style>
