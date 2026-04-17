const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const OK = 0
const UNKNOWN = 1000
const COUPLE_NOT_BOUND = 3006
const QUIZ_ALREADY_ANSWERED = 8101
const QUIZ_NOT_FOUND = 8102

const QUESTIONS = [
  '你觉得我们第一次见面时，你对我的第一印象是什么？',
  '如果可以带我去任何地方旅行，你会选择哪里？为什么？',
  '你认为我们在一起最幸福的时刻是什么？',
  '你最喜欢我身上的哪个小习惯？',
  '如果我们可以一起学一项新技能，你希望是什么？',
  '你觉得我们最像哪对影视剧里的情侣？',
  '你最想和我一起完成的一件事是什么？',
  '你觉得我最让你感动的一次是什么时候？',
  '如果只能用三个词形容我们的关系，你会选哪三个？',
  '你有没有一个只想和我分享的秘密？',
  '你觉得我们在哪方面最互补？',
  '如果我们可以一起开一家店，你希望是什么类型的？',
  '你最喜欢我们在一起做的日常小事是什么？',
  '你觉得我最需要改进的一个地方是什么？',
  '如果给我们的爱情写一首歌，歌名会是什么？',
  '你有没有因为我做的某件事而偷偷笑过？是什么？',
  '你觉得我们最默契的一次是什么时候？',
  '如果可以回到过去，你最想重温我们在一起的哪个瞬间？',
  '你认为维持一段好的感情最重要的是什么？',
  '你最希望我记住你的哪一面？',
  '你觉得我们在一起之后，你改变最大的是什么？',
  '如果我们可以一起养一只宠物，你希望是什么？',
  '你最喜欢我给你做的哪顿饭或者哪道菜？',
  '你觉得我们最像哪种动物的组合？',
  '如果可以给未来的我们写一封信，你会写什么？',
  '你有没有一个关于我们未来的小梦想？',
  '你觉得我最有魅力的时刻是什么时候？',
  '如果我们可以一起挑战一件勇敢的事，你会选什么？',
  '你最想对我说但还没说出口的话是什么？',
  '你觉得我们在一起最大的收获是什么？',
  '你最喜欢我们约会时做的哪件事？',
  '如果可以给我一个超能力，你希望是什么？',
  '你觉得我们哪次吵架之后反而让感情更好了？',
  '你最欣赏我在工作/学习上的哪个特质？',
  '如果我们可以一起完成一个公益项目，你希望是什么？',
  '你觉得我们在一起最有趣的经历是什么？',
  '你最希望我们一起养成的一个习惯是什么？',
  '你觉得我最像哪个卡通或动漫角色？',
  '如果可以为我们的关系设定一个主题曲，你会选哪首歌？',
  '你最感谢我为你做过的哪件事？',
  '你觉得我们在一起之后，你最大的成长是什么？',
  '如果我们可以一起参加一个综艺节目，你希望是哪种类型的？',
  '你最喜欢我们在哪个季节约会？为什么？',
  '你觉得我们最像哪种食物的组合？',
  '如果可以给我们的爱情拍一部电影，你希望是什么类型的？',
  '你最想和我一起看的一部电影或剧是什么？',
  '你觉得我最让你放心的一点是什么？',
  '如果我们可以一起做一次公路旅行，你希望去哪条路线？',
  '你最喜欢我们在一起时的哪种氛围？',
  '你觉得我们在一起最难忘的一个节日是哪个？',
  '你最希望我们一起实现的一个小目标是什么？',
  '你觉得我最让你骄傲的一件事是什么？',
  '如果可以给我们的关系打一个分（满分10分），你会打几分？为什么？',
  '你最喜欢我们在哪个地方约会？',
  '你觉得我们在一起最有默契的事情是什么？',
  '如果可以为我们的爱情设计一个专属符号，你会设计什么？',
  '你最想和我一起尝试的一种新食物是什么？',
  '你觉得我最让你感到安心的时刻是什么？',
  '如果我们可以一起学一门语言，你希望是哪种语言？',
  '你最喜欢我们在一起时的哪个小仪式？',
  '你觉得我们在一起之后，你最大的改变是什么？',
  '如果可以给我们的爱情写一本书，书名会是什么？',
  '你最想和我一起完成的一个挑战是什么？',
  '你觉得我最让你心动的一个细节是什么？',
  '如果我们可以一起参加一个运动，你希望是什么？',
  '你最喜欢我们在一起时的哪种天气？',
  '你觉得我们在一起最温馨的一个场景是什么？',
  '如果可以给我们的关系起一个外号，你会叫什么？',
  '你最想和我一起做的一件浪漫的事是什么？',
  '你觉得我最让你感到幸福的一句话是什么？',
  '如果我们可以一起种一棵树，你希望是什么树？',
  '你最喜欢我们在一起时的哪个表情或动作？',
  '你觉得我们在一起最有意义的一次经历是什么？',
  '如果可以给我们的爱情设定一个颜色，你会选什么颜色？',
  '你最想和我一起去看的一场演出是什么？',
  '你觉得我最让你感到惊喜的一次是什么时候？',
  '如果我们可以一起做一道菜，你希望是什么菜？',
  '你最喜欢我们在一起时的哪种状态？',
  '你觉得我们在一起最有趣的一个误会是什么？',
  '如果可以给我们的爱情设定一个气味，你会选什么？',
  '你最想和我一起完成的一个创意项目是什么？',
  '你觉得我最让你感到温暖的一个举动是什么？',
  '如果我们可以一起参加一个比赛，你希望是什么比赛？',
  '你最喜欢我们在一起时的哪种音乐？',
  '你觉得我们在一起最有价值的一次对话是什么？',
  '如果可以给我们的爱情设定一个形状，你会选什么形状？',
  '你最想和我一起体验的一种生活方式是什么？',
  '你觉得我最让你感到骄傲的一件事是什么？',
  '如果我们可以一起做一次志愿活动，你希望是什么？',
  '你最喜欢我们在一起时的哪种节奏？',
  '你觉得我们在一起最有趣的一个巧合是什么？',
  '如果可以给我们的爱情设定一个纹理，你会选什么？',
  '你最想和我一起实现的一个梦想是什么？',
  '你觉得我最让你感到依赖的一点是什么？',
  '如果我们可以一起写一首诗，第一句会是什么？',
  '你最喜欢我们在一起时的哪种光线？',
  '你觉得我们在一起最有意思的一个习惯是什么？',
  '如果可以给我们的爱情设定一个声音，你会选什么？',
  '你最想对未来的我们说一句什么话？'
]

function resp(code, message, data) {
  return { code, message, data: data || null }
}

async function getCoupleId(openid) {
  const res = await db.collection('users').where({ openid }).limit(1).get()
  if (!res.data.length || !res.data[0].coupleId) return null
  return res.data[0].coupleId
}

function dateKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysSinceEpoch(ts) {
  return Math.floor(ts / 86400000)
}

async function getTodayQuiz(event, openid) {
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '未绑定伴侣')

  const now = Date.now()
  const today = dateKey(now)
  const qIndex = daysSinceEpoch(now) % QUESTIONS.length
  const question = { index: qIndex, content: QUESTIONS[qIndex] }

  const answersRes = await db.collection('quiz_answers')
    .where({ coupleId, dateKey: today, isDeleted: false })
    .get()

  const answers = answersRes.data
  const myAnswer = answers.find(a => a.openid === openid) || null
  const partnerAnswer = answers.find(a => a.openid !== openid) || null
  const bothAnswered = !!(myAnswer && partnerAnswer)

  return resp(OK, 'ok', {
    question,
    today,
    myAnswer: myAnswer ? myAnswer.answer : null,
    partnerAnswer: bothAnswered ? partnerAnswer.answer : null,
    bothAnswered,
    waitingPartner: !!(myAnswer && !partnerAnswer)
  })
}

async function submitAnswer(event, openid) {
  const { answer } = event
  if (!answer || !answer.trim()) return resp(UNKNOWN, '答案不能为空')

  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '未绑定伴侣')

  const now = Date.now()
  const today = dateKey(now)
  const qIndex = daysSinceEpoch(now) % QUESTIONS.length

  const existing = await db.collection('quiz_answers')
    .where({ coupleId, dateKey: today, openid, isDeleted: false })
    .limit(1).get()
  if (existing.data.length) return resp(QUIZ_ALREADY_ANSWERED, '今天已经回答过了')

  await db.collection('quiz_answers').add({
    data: {
      coupleId,
      openid,
      dateKey: today,
      questionIndex: qIndex,
      questionContent: QUESTIONS[qIndex],
      answer: answer.trim(),
      createdAt: now,
      isDeleted: false
    }
  })
  return resp(OK, 'ok')
}

async function listHistory(event, openid) {
  const { page = 1, pageSize = 20 } = event
  const coupleId = await getCoupleId(openid)
  if (!coupleId) return resp(COUPLE_NOT_BOUND, '未绑定伴侣')

  const allRes = await db.collection('quiz_answers')
    .where({ coupleId, isDeleted: false })
    .orderBy('dateKey', 'desc')
    .limit(500)
    .get()

  const byDate = {}
  allRes.data.forEach(a => {
    if (!byDate[a.dateKey]) byDate[a.dateKey] = []
    byDate[a.dateKey].push(a)
  })

  const bothDates = Object.keys(byDate)
    .filter(d => byDate[d].length >= 2)
    .sort((a, b) => b.localeCompare(a))

  const today = dateKey(Date.now())
  const filtered = bothDates.filter(d => d !== today)

  const total = filtered.length
  const start = (page - 1) * pageSize
  const pageDates = filtered.slice(start, start + pageSize)

  const list = pageDates.map(d => {
    const pair = byDate[d]
    const mine = pair.find(a => a.openid === openid)
    const partner = pair.find(a => a.openid !== openid)
    return {
      dateKey: d,
      questionContent: pair[0].questionContent,
      myAnswer: mine ? mine.answer : '',
      partnerAnswer: partner ? partner.answer : ''
    }
  })

  return resp(OK, 'ok', { list, total, page, pageSize })
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'getTodayQuiz': return await getTodayQuiz(event, OPENID)
      case 'submitAnswer': return await submitAnswer(event, OPENID)
      case 'listHistory': return await listHistory(event, OPENID)
      default: return resp(UNKNOWN, 'unknown action')
    }
  } catch (e) {
    return resp(UNKNOWN, e.message || 'server error')
  }
}
