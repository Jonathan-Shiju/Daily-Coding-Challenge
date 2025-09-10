import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { faker } from '@faker-js/faker'

dotenv.config({ path: 'dev.env' })

const mongoURI = process.env.MONGO_URI

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
    required: true
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
    required: true
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

const generateRandomStudents = (count) => {
  const students = []
  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const name = `${firstName} ${lastName}`
    const reg_no = `2360${String(faker.number.int({ min: 100, max: 999 }))}`
    const official_mail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@btech.christuniversity.in`
    const studentClass = faker.string.fromCharacters(['A', 'B', 'C', 'D'])
    const department = faker.string.fromCharacters(['CSe', 'IT', 'EEE', 'ME'])

    students.push({
      name,
      official_mail,
      reg_no,
      class: studentClass,
      department
    })
  }
  return students
}

const generateRandomUsers = (students, facultyCount) => {
  const users = []
  // Generate user accounts for the students
  students.forEach((student) => {
    users.push({
      mail: student.official_mail,
      password: faker.internet.password(),
      name: student.name,
      role: 'student',
      reg_no: student.reg_no
    })
  })

  // Generate some faculty accounts
  for (let i = 0; i < facultyCount; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    users.push({
      mail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@christuniversity.in`,
      password: faker.internet.password(),
      name: `${firstName} ${lastName}`,
      role: 'faculty'
    })
  }
  return users
}

const sampleQuestions = [
  {
    sql_question:
      'What is the correct syntax to create a table named "employees"?',
    option1: 'CREATE TABLE employees (id INT, name VARCHAR(100));',
    option2: 'MAKE TABLE employees (id INT, name VARCHAR(100));',
    option3: 'CREATE DATABASE employees;',
    option4: 'INSERT INTO employees (id, name);',
    date: new Date(),
    correct_option: 'option1'
  },
  {
    sql_question:
      'Which SQL statement is used to extract data from a database?',
    option1: 'UPDATE',
    option2: 'SELECT',
    option3: 'GET',
    option4: 'EXTRACT',
    date: new Date(),
    correct_option: 'option2'
  },
  {
    sql_question: 'Which SQL keyword is used to sort the result-set?',
    option1: 'SORT BY',
    option2: 'ASCEND',
    option3: 'ORDER BY',
    option4: 'ARRANGE BY',
    date: new Date(),
    correct_option: 'option3'
  }
]

const sampleApps = [
  {
    name: 'Jane Smith',
    question_answer_option: 'option1',
    date_of_the_question: new Date()
  },
  {
    name: 'John Doe',
    question_answer_option: 'option4',
    date_of_the_question: new Date()
  }
]

const importData = async () => {
  try {
    await mongoose.connect(mongoURI)
    console.log('MongoDB connected...')

    // Clear existing data from all collections
    await User.deleteMany({})
    await Question.deleteMany({})
    await App.deleteMany({})
    await Student.deleteMany({})
    console.log('Existing data cleared from all collections.')

    // Generate and import new data
    const studentsToSeed = generateRandomStudents(100)
    const usersToSeed = generateRandomUsers(studentsToSeed, 5) // 5 faculty members

    await User.insertMany(usersToSeed)
    await Student.insertMany(studentsToSeed)
    await Question.insertMany(sampleQuestions)
    await App.insertMany(sampleApps)

    console.log('Data imported successfully!')
  } catch (err) {
    console.error(`Error importing data: ${err}`)
    process.exit(1)
  } finally {
    mongoose.connection.close()
    console.log('MongoDB connection closed.')
  }
}

if (process.argv[2] === '-d') {
  console.log('Deleting all data...')
  // Add a function to delete all data if needed
} else {
  importData()
}
