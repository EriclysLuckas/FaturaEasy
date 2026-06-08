export const errorSchemas = {
  unauthorized: {
    type: 'object',

    properties: {
      success: {
        type: 'boolean',
      },

      message: {
        type: 'string',
      },
    },
  },

  forbidden: {
    type: 'object',

    properties: {
      success: {
        type: 'boolean',
      },

      message: {
        type: 'string',
      },
    },
  },

  badRequest: {
    type: 'object',

    properties: {
      success: {
        type: 'boolean',
      },

      message: {
        type: 'string',
      },
    },
  },

  notFound: {
    type: 'object',

    properties: {
      success: {
        type: 'boolean',
      },

      message: {
        type: 'string',
      },
    },
  },
}