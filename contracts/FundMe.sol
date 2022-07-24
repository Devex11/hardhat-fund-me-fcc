// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

error FundMe__NotOwner();
/// @title A contract for funding 
/// @author Gaurav Devsarmah 
/// @notice This contract is to demo sample funding contract 
/// @dev This implements pricefeeds as our library 

contract FundMe {
    using PriceConverter for uint256;

    mapping(address => uint256) private addressToAmountFunded;
    address[] private funders;

    // Could we make this constant?  /* hint: no! We should make it immutable! */
    address private/* immutable */ i_owner;
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18;

    AggregatorV3Interface private  priceFeed;
    
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        priceFeed= AggregatorV3Interface(priceFeedAddress);
    }

    function fund() public payable {
        require(msg.value.getConversionRate(priceFeed) >= MINIMUM_USD, "You need to spend more ETH!");
        // require(PriceConverter.getConversionRate(msg.value) >= MINIMUM_USD, "You need to spend more ETH!");
        addressToAmountFunded[msg.sender] += msg.value;
        funders.push(msg.sender);
    }
    
    
    
    modifier onlyOwner {
        // require(msg.sender == owner);
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _;
    }
    
    function withdraw() payable onlyOwner public {
        for (uint256 funderIndex=0; funderIndex < funders.length; funderIndex++){
            address funder = funders[funderIndex];
            addressToAmountFunded[funder] = 0;
        }
        funders = new address[](0);
        // // transfer
        // payable(msg.sender).transfer(address(this).balance);
        // // send
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "Send failed");
        // call
        
        
        (bool callSuccess, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(callSuccess, "Call failed");
    }
    function cheaperWithdraw()public payable onlyOwner{
        address [] memory w_funders= funders;
        //this is making sure that the function doesn't keep reading from the 
        //global variable funders which is expensive 
        //so converting it to address []memory funders 
        for (uint256 funderIndex=0; funderIndex<w_funders.length;funderIndex++){
        address cheaperFunder= w_funders[funderIndex];
        addressToAmountFunded [cheaperFunder] =0; //resetting the funders mapping to position 0
        }
        funders = new address [](0);
        (bool callSuccess, )= payable (msg.sender).call{value: address(this).balance}("");
        require (callSuccess, "failed");




    }
    // Explainer from: https://solidity-by-example.org/fallback/
    // Ether is sent to contract
    //      is msg.data empty?
    //          /   \ 
    //         yes  no
    //         /     \
    //    receive()?  fallback() 
    //     /   \ 
    //   yes   no
    //  /        \
    //receive()  fallback()

    fallback() external payable {
        fund();
    }

    receive() external payable {
        fund();
    }
// writing the getter functions after making certain variables private to save gas
    function getOwner()public view returns (address){
        return i_owner;
    }
    function getFunder(uint256 index) public view returns (address){
        return funders[index];
    }
    function getAddressToAmountFunded(address funder)public view returns (uint256){
    return addressToAmountFunded[funder];
    }
    function getPriceFeed()public view returns (AggregatorV3Interface){
        return priceFeed;

    }


}