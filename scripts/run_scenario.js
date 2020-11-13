require("dotenv").config()

const commander = require("commander")

commander
  .version("1.0.0")
  .option("-t, --test <test_name>", "Test suite name")
  .option("-s, --scenario <scenario_name>", "Scenario name")
  .parse(process.argv)


const runScenario = async () => {

  const testSuite = require(`../test/${commander.test}/${commander.test}_scenarios.js`)
  console.log(commander.scenario, testSuite)
  const result = await testSuite[commander.scenario]()
  console.log("Response: ", result)
  process.exit(0)
}

runScenario()
