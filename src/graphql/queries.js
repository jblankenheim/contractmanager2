/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getTransactionDate = /* GraphQL */ `
  query GetTransactionDate($id: ID!) {
    getTransactionDate(id: $id) {
      id
      date
      JSON
      remainingBushels
      remainingDollars
      contractID
      __typename
    }
  }
`;
export const listTransactionDates = /* GraphQL */ `
  query ListTransactionDates(
    $filter: ModelTransactionDateFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTransactionDates(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        date
        JSON
        remainingBushels
        remainingDollars
        contractID
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const transactionDatesByContractID = /* GraphQL */ `
  query TransactionDatesByContractID(
    $contractID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelTransactionDateFilterInput
    $limit: Int
    $nextToken: String
  ) {
    transactionDatesByContractID(
      contractID: $contractID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        date
        JSON
        remainingBushels
        remainingDollars
        contractID
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getContract = /* GraphQL */ `
  query GetContract($id: ID!) {
    getContract(id: $id) {
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
      __typename
    }
  }
`;
export const listContracts = /* GraphQL */ `
  query ListContracts(
    $filter: ModelContractFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listContracts(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const contractsByType = /* GraphQL */ `
  query ContractsByType(
    $contractType: ContractTypes!
    $sortDirection: ModelSortDirection
    $filter: ModelContractFilterInput
    $limit: Int
    $nextToken: String
  ) {
    contractsByType(
      contractType: $contractType
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const contractsByNumber = /* GraphQL */ `
  query ContractsByNumber(
    $contractNumber: String!
    $sortDirection: ModelSortDirection
    $filter: ModelContractFilterInput
    $limit: Int
    $nextToken: String
  ) {
    contractsByNumber(
      contractNumber: $contractNumber
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const contractsByName = /* GraphQL */ `
  query ContractsByName(
    $contractName: String!
    $sortDirection: ModelSortDirection
    $filter: ModelContractFilterInput
    $limit: Int
    $nextToken: String
  ) {
    contractsByName(
      contractName: $contractName
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
        __typename
      }
      nextToken
      __typename
    }
  }
`;
