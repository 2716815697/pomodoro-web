/**
 * 番茄钟状态机
 * 管理专注/休息轮次、倒计时、暂停/继续/跳过
 * 阶段结束时暂停并触发 onPhaseEnd 回调（用于弹窗）
 */

import { playAlarm } from './audio.js';

export function createTimer(options = {}) {
  const state = {
    focusMin: options.focusMin ?? 25,
    breakMin: options.breakMin ?? 5,
    totalRounds: options.totalRounds ?? 4,
    currentRound: 1,
    phase: 'focus',
    secondsLeft: (options.focusMin ?? 25) * 60,
    totalSeconds: (options.focusMin ?? 25) * 60,
    running: false,
    completed: false,
    paused: false,
    timerId: null,
    listeners: [],
    // 阶段的 end 信息：{ type: 'focus-end'|'break-end'|'all-done', round, ... }
    phaseEnd: null
  };

  const onPhaseEnd = options.onPhaseEnd || (() => {});

  function notify() {
    state.listeners.forEach(fn => fn({ ...state }));
  }

  function tick() {
    if (state.secondsLeft <= 0) {
      handlePhaseEnd();
      return;
    }
    state.secondsLeft--;
    notify();
  }

  /** 阶段结束：暂停 + 触发弹窗回调，不自动进入下一阶段 */
  function handlePhaseEnd() {
    clearTick();
    state.running = false;
    state.paused = true;

    let endType;
    if (state.phase === 'focus') {
      endType = state.currentRound >= state.totalRounds ? 'all-done' : 'focus-end';
    } else {
      endType = 'break-end';
    }

    const endInfo = {
      type: endType,
      round: state.currentRound,
      totalRounds: state.totalRounds,
      nextPhase: endType === 'all-done' ? null : (state.phase === 'focus' ? 'break' : 'focus'),
      nextRound: endType === 'all-done' ? state.currentRound : (state.phase === 'focus' ? state.currentRound : state.currentRound + 1)
    };
    state.phaseEnd = endInfo;

    playAlarm();
    notify();
    onPhaseEnd(endInfo);
  }

  function clearTick() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  return {
    get state() { return { ...state }; },

    subscribe(fn) {
      state.listeners.push(fn);
      return () => {
        state.listeners = state.listeners.filter(f => f !== fn);
      };
    },

    start() {
      if (state.completed) return;
      state.running = true;
      state.paused = false;
      clearTick();
      state.timerId = setInterval(tick, 1000);
      notify();
    },

    pause() {
      state.running = false;
      state.paused = true;
      clearTick();
      notify();
    },

    toggle() {
      if (state.completed) return;
      if (state.running) this.pause();
      else this.start();
    },

    /** 跳过当前阶段（触发弹窗，和自然结束一样走弹窗流程） */
    skip() {
      if (state.completed) return;
      clearTick();
      state.secondsLeft = 0;
      state.running = false;
      handlePhaseEnd();
    },

    /** 弹窗点击"继续"后调用，进入下一阶段 */
    continueToNext() {
      if (!state.phaseEnd) return;
      state.phaseEnd = null;
      if (state.completed) return;
      doTransition();
      if (!state.completed) this.start();
    },

    reset() {
      clearTick();
      state.running = false;
      state.paused = false;
      state.completed = false;
      state.phaseEnd = null;
      state.currentRound = 1;
      state.phase = 'focus';
      state.secondsLeft = state.focusMin * 60;
      state.totalSeconds = state.secondsLeft;
      notify();
    },

    updateSettings(focusMin, breakMin, totalRounds) {
      state.focusMin = focusMin;
      state.breakMin = breakMin;
      state.totalRounds = totalRounds;
      if (state.running) {
        // 运行中只更新轮次指示等 UI，不重置计时
        notify();
      } else {
        this.reset();
      }
    },

    destroy() {
      clearTick();
      state.listeners = [];
    }
  };

  /** 内部：切换到下一阶段（无弹窗） */
  function doTransition() {
    if (state.phase === 'focus') {
      if (state.currentRound >= state.totalRounds) {
        state.running = false;
        state.completed = true;
        state.paused = false;
        clearTick();
        notify();
        return;
      }
      state.phase = 'break';
    } else {
      state.currentRound++;
      state.phase = 'focus';
    }
    state.secondsLeft = state.phase === 'focus'
      ? state.focusMin * 60
      : state.breakMin * 60;
    state.totalSeconds = state.secondsLeft;
    notify();
  }
}
