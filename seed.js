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
  // The date the question was added.
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

// Schema for student answers
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

// Schema for personal info
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

// Hardcoded questions for consistency
const sampleQuestions = [
  {
    sql_question:
      'What is the correct syntax to create a table named "employees"?',
    option1: 'CREATE TABLE employees (id INT, name VARCHAR(100));',
    option2: 'MAKE TABLE employees (id INT, name VARCHAR(100));',
    option3: 'CREATE DATABASE employees;',
    option4: 'INSERT INTO employees (id, name);',
    correct_option: 'option1'
  },
  {
    sql_question:
      'Which SQL statement is used to extract data from a database?',
    option1: 'UPDATE',
    option2: 'SELECT',
    option3: 'GET',
    option4: 'EXTRACT',
    correct_option: 'option2'
  },
  {
    sql_question: 'Which SQL keyword is used to sort the result-set?',
    option1: 'SORT BY',
    option2: 'ASCEND',
    option3: 'ORDER BY',
    option4: 'ARRANGE BY',
    correct_option: 'option3'
  }
]

// Generate student info and user accounts
const generateData = (studentCount, facultyCount) => {
  const students = []
  const users = []
  const answers = []

  // Generate student data
  for (let i = 0; i < studentCount; i++) {
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

    // Create a corresponding user account for the student
    users.push({
      mail: official_mail,
      password: faker.internet.password(),
      name: name,
      role: 'student',
      reg_no: reg_no
    })
  }

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

  // Generate answers for a subset of students and questions
  const questionsToAnswer = sampleQuestions.slice(0, 3) // Use the first 3 questions for answers
  const studentsWhoAnswered = students.slice(0, Math.floor(studentCount / 2)) // Half the students have answered
  const options = ['option1', 'option2', 'option3', 'option4']

  studentsWhoAnswered.forEach((student) => {
    questionsToAnswer.forEach((question) => {
      // Create a random answer for each student and question
      answers.push({
        name: student.name,
        question_answer_option: options[faker.number.int({ min: 0, max: 3 })],
        date_of_the_question: faker.date.recent({ days: 30 })
      })
    })
  })

  return { students, users, answers }
}

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
    const { students, users, answers } = generateData(100, 5) // 100 students, 5 faculty

    await User.insertMany(users)
    await Student.insertMany(students)
    await Question.insertMany(sampleQuestions)
    await App.insertMany(answers)

    console.log('Data imported successfully!')
    console.log(`- Students seeded: ${students.length}`)
    console.log(`- Users seeded (students & faculty): ${users.length}`)
    console.log(`- Questions seeded: ${sampleQuestions.length}`)
    console.log(`- App entries seeded (answers): ${answers.length}`)
  } catch (err) {
    console.error(`Error importing data: ${err}`)
    process.exit(1)
  } finally {
    mongoose.connection.close()
    console.log('MongoDB connection closed.')
  }
}

// Check for command-line arguments to run the script
if (process.argv[2] === '--seed') {
  importData()
} else if (process.argv[2] === '--clear') {
  mongoose
    .connect(mongoURI)
    .then(async () => {
      console.log('MongoDB connected...')
      await User.deleteMany({})
      await Question.deleteMany({})
      await App.deleteMany({})
      await Student.deleteMany({})
      console.log('Existing data cleared from all collections.')
      mongoose.connection.close()
      console.log('MongoDB connection closed.')
    })
    .catch((err) => {
      console.error(`Error clearing data: ${err}`)
    })
} else {
  console.log(
    'Please specify an action: use "--seed" to import data or "--clear" to delete all data.'
  )
}
