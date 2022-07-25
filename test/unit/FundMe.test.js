const { deployments, ethers, networks } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config");
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", function () {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1"); //"1000000000000000000"; //18 zeroes or 1 ETH
      beforeEach(async () => {
        //const { deployer } = await getNamedAccounts(); //this tells the account that is connected to fundMe
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]); //fixture will deploy all contracts like fundme and mockv3

        fundMe = await ethers.getContract("FundMe", deployer); //deployer means when function fundme is called it'll always be from deployer account
        //the describe fundMe is really just deploying the fundMe contract before I can test elements like construtor etc.//
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });
      describe("constructor", function () {
        it("sets the aggregator addresses correctly", async function () {
          const response = await fundMe.getPriceFeed(); //priceFeed is from fundme.sol contract constructor
          assert.equal(response, mockV3Aggregator.address);
        });
      });
      describe("fund", function () {
        it("Fails if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });
        it("Updates the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue }); // we funded SC with 1 eth
          const response = await fundMe.getAddressToAmountFunded(deployer);
          // getAddressToAmountFunded maps addresses to amount of eth sent
          // so the above is telling how much eth has been sent by deployer (which is 1 eth)
          assert.equal(response.toString(), sendValue.toString());
        });
        it("Adds funder to array of getFunder", async function () {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });
      describe("withdraw", function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue }); //what the beforeEach here does is funds the SC with eth so we can test the withdraw function
        });
        it("withdraws ETH from a single funder", async function () {
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address //shows the SC balance to start with
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer // shows deployer balance so can be compared changes to fundMe balance
          );
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt; //pulling out gasUsed & effe..gas.. from transaction receipt after seeing them in the debuggger
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          assert.equal(endingFundMeBalance, 0); //0 because money from fundMe contract is withdrawed to deployer address

          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString() //as this'll cost gas, important to add gas cost
          );
          //because startingFundMe+startingDeployer is what should be in the endingDeployer
        });
        it("allows us to withdraw when there's multiple getFunder", async function () {
          //looking at it with multiple getFunder now
          const accounts = await ethers.getSigners();
          //each account under accounts will call the fund () function
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            //FundMe contract is connected to different i accounts now instead of fundMe= await ethers.getContract("FundMe",deployer)
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          assert.equal(endingFundMeBalance, 0);
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
          await expect(fundMe.getFunder(0)).to.be.reverted;
          // making sure the getFunder addresses are reset properly
          for (i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              //this is making sure that mapping al acocounts results in balance of 0 for alla ccounts
              0
            );
          }
        });
        it("Only allows the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const fundMeConnectedContract = await fundMe.connect(accounts[1]);
          await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith(
            "FundMe__NotOwner"
          );
        });
      });
    });

//writing cheaper withdraw test

it("allows us to withdraw in cheaper manner", async function () {
  //looking at it with multiple getFunder now
  const accounts = await ethers.getSigners();
  //each account under accounts will call the fund () function
  for (let i = 1; i < 6; i++) {
    const fundMeConnectedContract = await fundMe.connect(accounts[i]);
    //FundMe contract is connected to different i accounts now instead of fundMe= await ethers.getContract("FundMe",deployer)
    await fundMeConnectedContract.fund({ value: sendValue });
  }
  const startingFundMeBalance = await fundMe.provider.getBalance(
    fundMe.address
  );
  const startingDeployerBalance = await fundMe.provider.getBalance(deployer);
  const transactionResponse = await fundMe.cheaperWithdraw();
  const transactionReceipt = await transactionResponse.wait(1);
  const { gasUsed, effectiveGasPrice } = transactionReceipt;
  const gasCost = gasUsed.mul(effectiveGasPrice);
  const endingFundMeBalance = await fundMe.provider.getBalance(fundMe.address);
  assert.equal(endingFundMeBalance, 0);
  const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
  assert.equal(
    startingFundMeBalance.add(startingDeployerBalance).toString(),
    endingDeployerBalance.add(gasCost).toString()
  );
  await expect(fundMe.getFunder(0)).to.be.reverted;
  // making sure the getFunder addresses are reset properly
  for (i = 1; i < 6; i++) {
    assert.equal(
      await fundMe.getAddressToAmountFunded(accounts[i].address),
      //this is making sure that mapping al acocounts results in balance of 0 for alla ccounts
      0
    );
  }
});
it("Only allows the owner to withdraw", async function () {
  const accounts = await ethers.getSigners();
  const fundMeConnectedContract = await fundMe.connect(accounts[1]);
  await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith(
    "FundMe__NotOwner"
  );
});

//writing cheaper withdraw test
