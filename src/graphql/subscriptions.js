/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateTransactionDate = /* GraphQL */ `
  subscription OnCreateTransactionDate(
    $filter: ModelSubscriptionTransactionDateFilterInput
  ) {
    onCreateTransactionDate(filter: $filter) {
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
export const onUpdateTransactionDate = /* GraphQL */ `
  subscription OnUpdateTransactionDate(
    $filter: ModelSubscriptionTransactionDateFilterInput
  ) {
    onUpdateTransactionDate(filter: $filter) {
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
export const onDeleteTransactionDate = /* GraphQL */ `
  subscription OnDeleteTransactionDate(
    $filter: ModelSubscriptionTransactionDateFilterInput
  ) {
    onDeleteTransactionDate(filter: $filter) {
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
export const onCreateContract = /* GraphQL */ `
  subscription OnCreateContract($filter: ModelSubscriptionContractFilterInput) {
    onCreateContract(filter: $filter) {
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
export const onUpdateContract = /* GraphQL */ `
  subscription OnUpdateContract($filter: ModelSubscriptionContractFilterInput) {
    onUpdateContract(filter: $filter) {
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
export const onDeleteContract = /* GraphQL */ `
  subscription OnDeleteContract($filter: ModelSubscriptionContractFilterInput) {
    onDeleteContract(filter: $filter) {
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
