const meetingCost = require('../../utils/meeting-cost')
const storage = require('../../utils/storage')
const toolService = require('../../utils/tools')
const analytics = require('../../utils/analytics')

function toast(title) {
  wx.showToast({ title, icon: 'none' })
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatRecordTime(timestamp) {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toViewRecord(record) {
  return {
    id: record.id,
    timeText: formatRecordTime(record.startedAt),
    people: record.people,
    durationText: meetingCost.formatClock(record.durationMs),
    costText: meetingCost.formatCost(record.cost)
  }
}

Page({
  data: {
    people: '5',
    payType: 'monthly',
    amount: '',
    workDaysPerMonth: '21.75',
    workHoursPerDay: '8',
    amountLabel: '平均月薪（元）',
    rateReady: false,
    rateHint: '填写人数和薪酬后开始计时',
    status: 'idle',
    clock: '00:00:00',
    liveCost: '0.00 元',
    weekCount: 0,
    weekDurationText: '00:00:00',
    weekCostText: '0.00 元',
    records: [],
    canUndoDelete: false
  },

  onLoad() {
    analytics.trackToolOpen('meeting-cost')
    this.session = null
    this.timer = null
    this.lastDeleted = null
    this.loadState()
    this.refreshDerived()
  },

  onShow() {
    toolService.recordRecent('meeting-cost')
    // 后台返回后按时间戳恢复显示。
    this.tick()
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },

  loadState() {
    const saved = storage.get(storage.KEYS.meetingCostRecords, null)
    if (!saved || typeof saved !== 'object') return

    const settings = saved.settings || {}
    const patch = {}
    if (settings.people !== undefined) patch.people = String(settings.people)
    if (settings.amount !== undefined) patch.amount = String(settings.amount)
    if (settings.workDaysPerMonth !== undefined) patch.workDaysPerMonth = String(settings.workDaysPerMonth)
    if (settings.workHoursPerDay !== undefined) patch.workHoursPerDay = String(settings.workHoursPerDay)
    if (settings.payType === 'hourly' || settings.payType === 'monthly') patch.payType = settings.payType
    if (Object.keys(patch).length) this.setData(patch)

    const records = (Array.isArray(saved.records) ? saved.records : [])
      .map((record) => meetingCost.normalizeRecord(record))
      .filter((record) => record)
    this.records = records

    const session = meetingCost.normalizeSession(saved.session)
    this.session = session
    if (session) {
      this.setData({ status: session.status })
      if (session.status === 'running') this.startTimer()
    }
  },

  saveState() {
    const ok = storage.set(storage.KEYS.meetingCostRecords, {
      session: this.session,
      records: this.records,
      settings: {
        people: this.data.people,
        payType: this.data.payType,
        amount: this.data.amount,
        workDaysPerMonth: this.data.workDaysPerMonth,
        workHoursPerDay: this.data.workHoursPerDay
      }
    })
    if (!ok) toast('本机保存失败，请检查手机存储空间')
    return ok
  },

  getRate() {
    return meetingCost.hourlyRate({
      payType: this.data.payType,
      amount: this.data.amount,
      workDaysPerMonth: this.data.workDaysPerMonth,
      workHoursPerDay: this.data.workHoursPerDay
    })
  },

  getPeople() {
    const people = parseInt(this.data.people, 10)
    return Number.isFinite(people) && people >= 1 && people <= 999 ? people : null
  },

  refreshDerived() {
    const rate = this.getRate()
    const rateReady = rate !== null
    this.setData({
      amountLabel: this.data.payType === 'monthly' ? '平均月薪（元）' : '平均时薪（元）',
      rateReady,
      rateHint: rateReady
        ? `折算每人每小时 ${rate.toFixed(2)} 元`
        : '填写人数和薪酬后开始计时'
    })
    this.refreshWeek()
    this.renderRecords()
    this.tick()
  },

  refreshWeek() {
    const summary = meetingCost.weekSummary(this.records || [], Date.now())
    this.setData({
      weekCount: summary.count,
      weekDurationText: meetingCost.formatClock(summary.durationMs),
      weekCostText: meetingCost.formatCost(summary.cost)
    })
  },

  renderRecords() {
    this.setData({
      records: (this.records || []).map(toViewRecord),
      canUndoDelete: !!this.lastDeleted
    })
  },

  tick() {
    const status = this.session ? this.session.status : 'idle'
    if (!this.session) {
      if (this.data.clock !== '00:00:00') this.setData({ clock: '00:00:00', liveCost: '0.00 元' })
      return
    }
    const durationMs = meetingCost.currentDurationMs(this.session, Date.now())
    const rate = this.getRate()
    const people = this.getPeople() || 1
    const cost = meetingCost.costFor(rate, people, durationMs)
    this.setData({
      status,
      clock: meetingCost.formatClock(durationMs),
      liveCost: meetingCost.formatCost(cost)
    })
  },

  startTimer() {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 1000)
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  onPeopleInput(event) {
    this.setData({ people: String(event.detail.value || '') })
    this.refreshDerived()
  },

  onAmountInput(event) {
    this.setData({ amount: String(event.detail.value || '') })
    this.refreshDerived()
  },

  onWorkDaysInput(event) {
    this.setData({ workDaysPerMonth: String(event.detail.value || '') })
    this.refreshDerived()
  },

  onWorkHoursInput(event) {
    this.setData({ workHoursPerDay: String(event.detail.value || '') })
    this.refreshDerived()
  },

  selectPayType(event) {
    const payType = event.currentTarget.dataset.type === 'hourly' ? 'hourly' : 'monthly'
    this.setData({ payType })
    this.saveState()
    this.refreshDerived()
  },

  validateBeforeStart() {
    if (!this.getPeople()) {
      toast('请输入 1-999 的参会人数')
      return false
    }
    if (!this.getRate()) {
      toast('请先填写正确的薪酬信息')
      return false
    }
    return true
  },

  startMeeting() {
    if (!this.validateBeforeStart()) return
    this.session = meetingCost.startSession(Date.now())
    if (!this.saveState()) {
      this.session = null
      return
    }
    this.setData({ status: 'running' })
    this.startTimer()
    this.tick()
    analytics.trackToolAction('meeting-cost', 'start_timer', 'success')
  },

  pauseMeeting() {
    this.session = meetingCost.pauseSession(this.session, Date.now())
    if (!this.saveState()) {
      this.session = meetingCost.resumeSession(this.session, Date.now())
      return
    }
    this.stopTimer()
    this.setData({ status: 'paused' })
    this.tick()
  },

  resumeMeeting() {
    this.session = meetingCost.resumeSession(this.session, Date.now())
    if (!this.saveState()) {
      this.session = meetingCost.pauseSession(this.session, Date.now())
      return
    }
    this.setData({ status: 'running' })
    this.startTimer()
    this.tick()
  },

  finishMeeting() {
    const now = Date.now()
    const durationMs = meetingCost.finishSession(this.session, now)
    if (!durationMs || durationMs < 1000) {
      this.session = null
      this.stopTimer()
      this.saveState()
      this.setData({ status: 'idle' })
      this.tick()
      toast('时间太短，没有记录')
      return
    }
    const rate = this.getRate()
    const people = this.getPeople() || 1
    const record = meetingCost.normalizeRecord({
      id: `${now}`,
      startedAt: now - durationMs,
      endedAt: now,
      durationMs,
      people,
      rate: rate || 0,
      cost: meetingCost.costFor(rate, people, durationMs)
    })
    const nextRecords = meetingCost.addRecord(this.records || [], record)
    const previousRecords = this.records
    this.records = nextRecords
    this.session = null
    this.stopTimer()
    if (!this.saveState()) {
      this.records = previousRecords
      return
    }
    this.lastDeleted = null
    this.setData({ status: 'idle' })
    this.tick()
    this.refreshWeek()
    this.renderRecords()
    toast('已记录这次会议')
    analytics.trackToolAction('meeting-cost', 'finish_timer', 'success')
  },

  deleteRecord(event) {
    const id = event.currentTarget.dataset.id
    const target = (this.records || []).find((record) => record.id === id)
    if (!target) return
    const nextRecords = meetingCost.removeRecord(this.records, id)
    const previousRecords = this.records
    this.records = nextRecords
    if (!this.saveState()) {
      this.records = previousRecords
      return
    }
    this.lastDeleted = target
    this.refreshWeek()
    this.renderRecords()
    analytics.trackToolAction('meeting-cost', 'delete_record', 'success')
  },

  undoDelete() {
    if (!this.lastDeleted) return
    const nextRecords = meetingCost.addRecord(this.records || [], this.lastDeleted)
    const previousRecords = this.records
    this.records = nextRecords
    if (!this.saveState()) {
      this.records = previousRecords
      return
    }
    this.lastDeleted = null
    this.refreshWeek()
    this.renderRecords()
  },

  onShareAppMessage() {
    return {
      title: '浦哥工具箱｜会议成本计时器',
      path: '/pages/meeting-cost/index'
    }
  }
})
