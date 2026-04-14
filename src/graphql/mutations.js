/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createTransactionDate = /* GraphQL */ `
  mutation CreateTransactionDate(
    $input: CreateTransactionDateInput!
    $condition: ModelTransactionDateConditionInput
  ) {
    createTransactionDate(input: $input, condition: $condition) {
      id
      date
      JSON
      remainingBushels
      remainingDollars
      contractID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateTransactionDate = /* GraphQL */ `
  mutation UpdateTransactionDate(
    $input: UpdateTransactionDateInput!
    $condition: ModelTransactionDateConditionInput
  ) {
    updateTransactionDate(input: $input, condition: $condition) {
      id
      date
      JSON
      remainingBushels
      remainingDollars
      contractID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteTransactionDate = /* GraphQL */ `
  mutation DeleteTransactionDate(
    $input: DeleteTransactionDateInput!
    $condition: ModelTransactionDateConditionInput
  ) {
    deleteTransactionDate(input: $input, condition: $condition) {
      id
      date
      JSON
      remainingBushels
      remainingDollars
      contractID
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createContract = /* GraphQL */ `
  mutation CreateContract(
    $input: CreateContractInput!
    $condition: ModelContractConditionInput
  ) {
    createContract(input: $input, condition: $condition) {
      id
      contractType
      contractNumber
      contractName
      contractLocation
      contractBushels
      contractDollars
      remainingBushels
      remainingDollars
      closedDate
      closedBy
      markforReview
      settlementReference
      pictureKey
      addendumKey1
      addendumKey2
      duplicateKey
      TransactionDates {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateContract = /* GraphQL */ `
  mutation UpdateContract(
    $input: UpdateContractInput!
    $condition: ModelContractConditionInput
  ) {
    updateContract(input: $input, condition: $condition) {
      id
      contractType
      contractNumber
      contractName
      contractLocation
      contractBushels
      contractDollars
      remainingBushels
      remainingDollars
      closedDate
      closedBy
      markforReview
      settlementReference
      pictureKey
      addendumKey1
      addendumKey2
      duplicateKey
      TransactionDates {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteContract = /* GraphQL */ `
  mutation DeleteContract(
    $input: DeleteContractInput!
    $condition: ModelContractConditionInput
  ) {
    deleteContract(input: $input, condition: $condition) {
      id
      contractType
      contractNumber
      contractName
      contractLocation
      contractBushels
      contractDollars
      remainingBushels
      remainingDollars
      closedDate
      closedBy
      markforReview
      settlementReference
      pictureKey
      addendumKey1
      addendumKey2
      duplicateKey
      TransactionDates {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
