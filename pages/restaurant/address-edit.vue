<template>
  <s-layout :title="formData.id ? '编辑地址' : '新增地址'">
    <view class="addr-edit">
      <view class="form-card">
        <view class="form-item">
          <text class="label">收货人</text>
          <input v-model="formData.name" placeholder="请输入收货人姓名" maxlength="30" />
        </view>
        <view class="form-item">
          <text class="label">手机号</text>
          <input v-model="formData.phone" type="number" placeholder="请输入手机号" maxlength="11" />
        </view>
        <view class="form-item">
          <text class="label">省市区</text>
          <input v-model="formData.region" placeholder="如：广东省 深圳市 南山区" maxlength="100" />
        </view>
        <view class="form-item">
          <text class="label">详细地址</text>
          <input v-model="formData.detail" placeholder="街道、门牌、楼栋号" maxlength="200" />
        </view>
        <view class="form-item switch-item">
          <text class="label">设为默认</text>
          <switch :checked="formData.defaultStatus === 1" @change="onDefaultChange" color="#fa5151" />
        </view>
      </view>

      <button type="primary" class="save-btn" :loading="saving" @tap="submit">保存</button>
    </view>
  </s-layout>
</template>

<script setup>
import { reactive, ref, onLoad } from 'vue';
import RestaurantAddressApi from '@/sheep/api/restaurant/address';

const saving = ref(false);

const formData = reactive({
  id: undefined,
  name: '',
  phone: '',
  region: '',
  detail: '',
  defaultStatus: 0,
});

onLoad(async (options) => {
  // 编辑模式：从列表页带 id 进入，拉取该条回填（列表数据即本人地址，归属由后端保证）
  if (options.id) {
    const res = await RestaurantAddressApi.getMyList();
    if (res.code === 0) {
      const hit = (res.data || []).find((a) => String(a.id) === String(options.id));
      if (hit) {
        formData.id = hit.id;
        formData.name = hit.name;
        formData.phone = hit.phone;
        formData.region = hit.region;
        formData.detail = hit.detail;
        formData.defaultStatus = hit.defaultStatus;
      }
    }
  }
});

function onDefaultChange(e) {
  formData.defaultStatus = e.detail.value ? 1 : 0;
}

function validate() {
  if (!formData.name.trim()) {
    uni.showToast({ title: '请输入收货人姓名', icon: 'none' });
    return false;
  }
  if (!/^1\d{10}$/.test(formData.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return false;
  }
  if (!formData.region.trim()) {
    uni.showToast({ title: '请输入省市区', icon: 'none' });
    return false;
  }
  if (!formData.detail.trim()) {
    uni.showToast({ title: '请输入详细地址', icon: 'none' });
    return false;
  }
  return true;
}

async function submit() {
  if (!validate() || saving.value) return;
  saving.value = true;
  try {
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone,
      region: formData.region.trim(),
      detail: formData.detail.trim(),
      defaultStatus: formData.defaultStatus,
    };
    const res = formData.id
      ? await RestaurantAddressApi.update({ ...payload, id: formData.id })
      : await RestaurantAddressApi.create(payload);
    if (res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => uni.navigateBack(), 600);
    }
  } finally {
    saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
.addr-edit { padding: 20rpx; }
.form-card { background: #fff; border-radius: 12rpx; padding: 8rpx 24rpx; }
.form-item { display: flex; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.form-item:last-child { border-bottom: none; }
.label { width: 160rpx; font-size: 28rpx; color: #333; flex-shrink: 0; }
input { flex: 1; font-size: 28rpx; }
.switch-item { justify-content: space-between; }
.save-btn { margin-top: 40rpx; }
</style>
