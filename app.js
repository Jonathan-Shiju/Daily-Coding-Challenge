import express from 'express'
import mongoose from 'mongoose' // Mongoose is still needed for models
import path from 'path'
import { config } from 'dotenv'
import session from 'express-session'
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { fileURLToPath } from 'url'

// Import the new connection function
import { connectToDatabase } from './config/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envFile =
  process.env.NODE_ENV === 'production' || process.argv.includes('--prod')
    ? '.env'
    : 'dev.env'
config({ path: envFile })

const app = express()
const PORT = process.env.PORT

// Models need to be defined here because Mongoose models are tied to a connection
// and you'll get a 'MissingSchemaError' if you try to use them before the connection is established.
const userSchema = new mongoose.Schema({
  mail: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: false },
  role: { type: String, enum: ['student', 'faculty'], required: true },
  reg_no: { type: String, required: false }
})

const questionSchema = new mongoose.Schema({
  sql_question: { type: String, required: true },
  option1: { type: String, required: true },
  option2: { type: String, required: true },
  option3: { type: String, required: true },
  option4: { type: String, required: true },
  date: { type: Date, default: Date.now },
  correct_option: { type: String, required: true }
})

const appSchema = new mongoose.Schema({
  name: { type: String, required: true },
  question_answer_option: { type: String, required: true },
  date_of_the_question: { type: Date, required: true }
})

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  official_mail: { type: String, required: true },
  reg_no: { type: String, required: false },
  class: { type: String, required: true },
  department: { type: String, required: true }
})

const User = mongoose.model('User', userSchema)
const Question = mongoose.model('Question', questionSchema)
const App = mongoose.model('App', appSchema)
const Student = mongoose.model('Student', studentSchema)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, 'public')))
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')))

app.use(
  session({
    secret: 'mynameisjonathanshiju',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  })
)
app.use(passport.initialize())
app.use(passport.session())

passport.use(
  new LocalStrategy(
    { usernameField: 'mail', passwordField: 'password' },
    async (mail, password, done) => {
      try {
        const user = await User.findOne({ mail })
        if (!user) return done(null, false, { message: 'Incorrect username.' })
        if (user.password !== password)
          return done(null, false, { message: 'Incorrect password.' })
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }
  )
)

passport.serializeUser((user, done) => {
  done(null, user.id)
})
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (err) {
    done(err)
  }
})

app.post(
  '/log-in',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/log-in'
  })
)

app.get('/login-form', (req, res) => {
  res.render('login-form')
})
app.get('/signup-form', (req, res) => {
  res.render('signup-form')
})

app.post('/sign-up', async (req, res) => {
  const { mail, password } = req.body
  let role = ''
  if (mail.endsWith('@btech.christuniversity.in')) {
    role = 'student'
  } else if (mail.endsWith('@christuniversity.in')) {
    role = 'faculty'
  } else {
    return res.status(400).send('Invalid email domain')
  }
  try {
    let userData = { mail, password, role }
    if (role === 'student') {
      const info = await Student.findOne({ official_mail: mail })
      if (!info) return res.status(400).send('Student info not found')
      userData.name = info.name
      userData.reg_no = info.reg_no
    }
    const user = new User(userData)
    await user.save()
    res.redirect('/login-form')
  } catch (err) {
    res.status(400).send('Error signing up')
  }
})

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/')
  })
})

app.get('/', (req, res) => {
  const user = req.user || null
  res.render('index', { user })
})
app.get('/dashboard', (req, res) => {
  const alert = req.query.alert || null
  console.log('Dashboard accessed by:', req.user?.mail)
  res.render('dashboard', { alert, user: req.user })
})

// All routes will now automatically use the existing connection
app.get('/results', async (req, res) => {
  const user = req.user || null
  const dateParam = req.query.date
  const date = dateParam ? new Date(dateParam) : new Date()
  date.setHours(0, 0, 0, 0)
  const tomorrow = new Date(date)
  tomorrow.setDate(date.getDate() + 1)
  const question = await Question.findOne({
    date: { $gte: date, $lt: tomorrow }
  })
  if (!question) {
    return res.redirect('/dashboard?alert=noQuestion')
  }
  const record = await App.findOne({
    name: user.name,
    date_of_the_question: { $gte: date, $lt: tomorrow }
  })
  if (!record) {
    return res.redirect('/dashboard?alert=notDone')
  }

  const user_answer = record ? record.question_answer_option : null

  if (dateParam) {
    const qDate = new Date(dateParam)
    qDate.setHours(0, 0, 0, 0)
    const earliestRec = await App.findOne({ name: user.name }).sort({
      date_of_the_question: 1
    })
    const latestRec = await App.findOne({ name: user.name }).sort({
      date_of_the_question: -1
    })
    if (earliestRec && latestRec) {
      const eDate = new Date(earliestRec.date_of_the_question)
      eDate.setHours(0, 0, 0, 0)
      const lDate = new Date(latestRec.date_of_the_question)
      lDate.setHours(0, 0, 0, 0)
      if (qDate < eDate || qDate > lDate) {
        return res.redirect('/dashboard?alert=wrongDate')
      }
    }
  }

  res.render('Results', { user, question, user_answer })
})
app.get('/results-faculty', async (req, res) => {
  const dateParam = req.query.date
  const date = dateParam ? new Date(dateParam) : new Date()
  date.setHours(0, 0, 0, 0)
  const tomorrow = new Date(date)
  tomorrow.setDate(date.getDate() + 1)
  const question = await Question.findOne({
    date: { $gte: date, $lt: tomorrow }
  })
  if (!question) {
    return res.redirect('/dashboard?alert=noQuestion')
  }
  const allStudents = await User.find({ role: 'student' })
  const responses = await App.find({
    date_of_the_question: { $gte: date, $lt: tomorrow }
  })
  const attempted = []
  const unattempted = []
  allStudents.forEach((u) => {
    const entry = { regNo: u.reg_no, name: u.name }
    if (responses.some((r) => r.name === u.name)) attempted.push(entry)
    else unattempted.push(entry)
  })
  const infos = await Student.find({})
  const classes = [...new Set(infos.map((s) => s.class))]
  const departments = [...new Set(infos.map((s) => s.department))]
  res.render('Results-faculty', {
    attempted,
    unattempted,
    classes,
    departments,
    dateParam,
    classFilter: '',
    deptFilter: ''
  })
})

app.post('/results-faculty', async (req, res) => {
  const dateParam = req.query.date
  const classFilter = req.body.classFilter
  const deptFilter = req.body.deptFilter
  const date = dateParam ? new Date(dateParam) : new Date()
  date.setHours(0, 0, 0, 0)
  const tomorrow = new Date(date)
  tomorrow.setDate(date.getDate() + 1)
  const allStudents = await User.find({ role: 'student' })
  const infos = await Student.find({})
  const infoMap = infos.reduce((m, s) => {
    m[s.official_mail] = s
    return m
  }, {})
  const responses = await App.find({
    date_of_the_question: { $gte: date, $lt: tomorrow }
  })
  const attempted = []
  const unattempted = []
  allStudents.forEach((u) => {
    const info = infoMap[u.mail] || {}
    const entry = {
      regNo: u.reg_no,
      name: u.name,
      class: info.class,
      department: info.department
    }
    if (responses.some((r) => r.name === u.name)) attempted.push(entry)
    else unattempted.push(entry)
  })
  const filtAtt = attempted.filter(
    (e) =>
      (!classFilter || e.class === classFilter) &&
      (!deptFilter || e.department === deptFilter)
  )
  const filtUn = unattempted.filter(
    (e) =>
      (!classFilter || e.class === classFilter) &&
      (!deptFilter || e.department === deptFilter)
  )
  const classes = [...new Set(infos.map((s) => s.class))]
  const departments = [...new Set(infos.map((s) => s.department))]
  res.render('Results-faculty', {
    attempted: filtAtt,
    unattempted: filtUn,
    classes,
    departments,
    dateParam,
    classFilter,
    deptFilter
  })
})

app.get('/create-form', (req, res) => {
  res.render('create-form')
})
app.post('/create-form', async (req, res) => {
  const { sql_question, option1, option2, option3, option4, correct_option } =
    req.body
  await Question.create({
    sql_question,
    option1,
    option2,
    option3,
    option4,
    correct_option
  })
  res.redirect('/dashboard')
})
app.post('/questions', async (req, res) => {
  if (!req.user) return res.redirect('/log-in')
  const answer = req.body.answer
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  await App.create({
    name: req.user.name,
    question_answer_option: answer,
    date_of_the_question: today
  })
  res.redirect('/dashboard')
})
app.get('/welcome-page', async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const q = await Question.findOne({ date: { $gte: today, $lt: tomorrow } })
  if (!q) {
    return res.redirect('/dashboard?alert=noQuestion')
  }
  const user = req.user || null
  res.render('welcome-page', { user })
})
app.get('/questions', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const question = await Question.findOne({
      date: { $gte: today, $lt: tomorrow }
    })
    res.render('questions', { question })
  } catch (err) {
    res.status(500).send('Error fetching question')
  }
})

// The server now starts only after the database connection is successfully established.
const launchUrl = process.env.LAUNCH_URL || `http://localhost:${PORT}`

;(async () => {
  try {
    await connectToDatabase()
    app.listen(PORT, () => {
      console.log(`Server is running on ${launchUrl}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
})()
