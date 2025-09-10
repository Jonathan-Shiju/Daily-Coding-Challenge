import express from 'express'
import mongoose from 'mongoose'
import path from 'path'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import session from 'express-session'
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'

const envFile =
  process.env.NODE_ENV === 'production' || process.argv.includes('--prod')
    ? '.env'
    : 'dev.env'
config({ path: envFile })

const app = express()
const PORT = process.env.PORT
const mongoUri = process.env.MONGO_URI

mongoose
  .connect(mongoUri)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('Connection error', err))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Define the schema for the User database
const userSchema = new mongoose.Schema({
  // The official email for login, unique
  mail: {
    type: String,
    required: true,
    unique: true
  },
  // The user's password. It's highly recommended to hash this before saving.
  password: {
    type: String,
    required: true
  },
  // The user's full name.
  name: {
    type: String,
    required: false
  },
  // The user's role, restricted to either 'student' or 'faculty'.
  role: {
    type: String,
    enum: ['student', 'faculty'],
    required: true
  },
  // The student's registration number.
  reg_no: {
    type: String,
    required: false
  }
})

// Define the schema for the Questions database
const questionSchema = new mongoose.Schema({
  // The SQL question text.
  sql_question: {
    type: String,
    required: true
  },
  // Four options for the question.
  option1: {
    type: String,
    required: true
  },
  option2: {
    type: String,
    required: true
  },
  option3: {
    type: String,
    required: true
  },
  option4: {
    type: String,
    required: true
  },
  // The date the question was added. Defaults to the current date.
  date: {
    type: Date,
    default: Date.now
  },
  // The correct option for the question.
  correct_option: {
    type: String,
    required: true
  }
})

// rename studentSchema to appSchema
const appSchema = new mongoose.Schema({
  // The name of the student who answered the question.
  name: {
    type: String,
    required: true
  },
  // The option the student selected as their answer.
  question_answer_option: {
    type: String,
    required: true
  },
  // The date the question was answered.
  date_of_the_question: {
    type: Date,
    required: true
  }
})

// new studentSchema for personal info
const studentSchema = new mongoose.Schema({
  // The name of the student.
  name: {
    type: String,
    required: true
  },
  // The official email of the student.
  official_mail: {
    type: String,
    required: true
  },
  // The student's registration number.
  reg_no: {
    type: String,
    required: false
  },
  // The class of the student.
  class: {
    type: String,
    required: true
  },
  // The department of the student.
  department: {
    type: String,
    required: true
  }
})

// Create Mongoose models from the schemas.
const User = mongoose.model('User', userSchema)
const Question = mongoose.model('Question', questionSchema)
const App = mongoose.model('App', appSchema)
const Student = mongoose.model('Student', studentSchema)

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, 'public')))
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')))

app.use(
  session({
    secret: 'mynameisjonathanshiju',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
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
    res.redirect('/log-in')
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
  // Replace with actual user session logic if available
  const user = req.user || null
  res.render('index', { user })
})
app.get('/dashboard', (req, res) => {
  const alert = req.query.alert || null
  console.log('Dashboard accessed by:', req.user?.mail)
  res.render('dashboard', { alert, user: req.user })
})
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

  // Date range validation
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
  // fetch all student users
  const allStudents = await User.find({ role: 'student' })
  // fetch responses for date
  const responses = await App.find({
    date_of_the_question: { $gte: date, $lt: tomorrow }
  })
  // build lists
  const attempted = []
  const unattempted = []
  allStudents.forEach((u) => {
    const entry = { regNo: u.reg_no, name: u.name }
    if (responses.some((r) => r.name === u.name)) attempted.push(entry)
    else unattempted.push(entry)
  })
  // populate dropdowns from personal info for all students
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

// Handle filtered results via POST
app.post('/results-faculty', async (req, res) => {
  const dateParam = req.query.date
  const classFilter = req.body.classFilter
  const deptFilter = req.body.deptFilter
  // reuse date filtering logic from GET
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
  // apply dropdown filters
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
  // ensure a question exists for today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const q = await Question.findOne({ date: { $gte: today, $lt: tomorrow } })
  if (!q) {
    // no question for today, redirect to dashboard with error
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
    // Find question where date is today
    const question = await Question.findOne({
      date: { $gte: today, $lt: tomorrow }
    })
    res.render('questions', { question })
  } catch (err) {
    res.status(500).send('Error fetching question')
  }
})

// read launch URL from env or default to localhost
const launchUrl = process.env.LAUNCH_URL || `http://localhost:${PORT}`
app.listen(PORT, () => {
  console.log(`Server is running on ${launchUrl}`)
})
