<template>
  <s-layout title="门店工作台">
    <view class="login-box">
      <view class="logo">🏪</view>
      <view class="title">门店工作台</view>
      <view class="subtitle">店员/收银专用（后台账号）</view>

      <!-- 主登录：微信一键登录 -->
      <button class="login-btn" :disabled="logging" @tap="wxLogin">
        {{ logging ? '登录中...' : '微信一键登录' }}
      </button>
      <view class="tip">首次使用请先在下方输入后台账号完成绑定</view>

      <!-- 绑定表单（折叠） -->
      <view v-if="showBind" class="bind-form">
        <view class="bind-title">绑定后台账号</view>
        <input v-model="username" class="ipt" placeholder="后台登录账号" placeholder-class="ph" />
        <input
          v-model="password"
          class="ipt"
          password
          placeholder="后台登录密码"
          placeholder-class="ph"
        />
        <button class="bind-btn" :disabled="binding" @tap="doBind">
          {{ binding ? '绑定中...' : '绑定并登录' }}
        </button>
      </view>
      <view v-else class="bind-entry" @tap="showBind = true">账号绑定 ></view>
    </view>
  </s-layout>
</template>

<script setup>
import { ref } from 'vue';
import StoreAuthApi from '@/sheep/api/restaurant/store-auth';
import { setStoreToken } from '@/sheep/request/store-request';

const logging = ref(false);
const binding = ref(false);
const showBind = ref(false);
const username = ref('');
const password = ref('');

// 拿微信 code（小程序环境）
function getWxCode() {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.login({
      provider: 'weixin',
      success: (res) => resolve(res.code),
      fail: (err) => reject(err),
    });
    // #endif
    // #ifndef MP-WEIXIN
    reject(new Error('门店工作台请在微信小程序内使用'));
    // #endif
  });
}

function gotoWorkbench() {
  uni.reLaunch({ url: '/pages/restaurant/store-workbench' });
}

// 微信一键登录；未绑定（STORE_USER_NOT_BOUND）时展开绑定表单
async function wxLogin() {
  if (logging.value) return;
  logging.value = true;
  try {
    const code = await getWxCode();
    const res = await StoreAuthApi.weixinMiniAppLogin(code);
    if (res.code === 0) {
      setStoreToken(res.data.accessToken, res.data.refreshToken);
      gotoWorkbench();
    } else {
      // 未绑定或其他错误：展开绑定表单引导
      showBind.value = true;
      if (res.code !== 0) {
        uni.showToast({ title: res.msg || '请先绑定后台账号', icon: 'none' });
      }
    }
  } catch (e) {
    uni.showToast({ title: e.message || '微信登录失败', icon: 'none' });
  } finally {
    logging.value = false;
  }
}

// 账号密码绑定（首次使用）
async function doBind() {
  if (binding.value) return;
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' });
    return;
  }
  binding.value = true;
  try {
    const code = await getWxCode();
    const res = await StoreAuthApi.bind(code, username.value.trim(), password.value);
    if (res.code === 0) {
      setStoreToken(res.data.accessToken, res.data.refreshToken);
      uni.showToast({ title: '绑定成功', icon: 'success' });
      setTimeout(gotoWorkbench, 600);
    }
  } catch (e) {
    uni.showToast({ title: e.message || '绑定失败', icon: 'none' });
  } finally {
    binding.value = false;
  }
}
</script>

<style lang="scss" scoped>
.login-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 60rpx 0;
}
.logo {
  font-size: 100rpx;
}
.title {
  margin-top: 20rpx;
  font-size: 40rpx;
  font-weight: 600;
}
.subtitle {
  margin: 12rpx 0 60rpx;
  font-size: 26rpx;
  color: #999;
}
.login-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  &::after {
    border: none;
  }
  &[disabled] {
    opacity: 0.6;
  }
}
.tip {
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #bbb;
}
.bind-entry {
  margin-top: 40rpx;
  font-size: 26rpx;
  color: #576b95;
}
.bind-form {
  width: 100%;
  margin-top: 60rpx;
  padding: 40rpx;
  background: #fff;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.bind-title {
  margin-bottom: 24rpx;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
}
.ipt {
  height: 80rpx;
  padding: 0 24rpx;
  margin-bottom: 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.ph {
  color: #bbb;
}
.bind-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #576b95;
  color: #fff;
  font-size: 30rpx;
  border-radius: 40rpx;
  &::after {
    border: none;
  }
  &[disabled] {
    opacity: 0.6;
  }
}
</style>
