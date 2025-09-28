module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'airbnb-base'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-console': 'off',
        'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
        'no-underscore-dangle': 'off',
        'max-len': ['error', { 'code': 120 }],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        'comma-dangle': ['error', 'never'],
        'no-trailing-spaces': 'error',
        'eol-last': 'error',
        'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-arrow-callback': 'error',
        'arrow-spacing': 'error',
        'no-duplicate-imports': 'error',
        'no-useless-return': 'error',
        'no-useless-constructor': 'error',
        'no-useless-concat': 'error',
        'prefer-template': 'error',
        'template-curly-spacing': 'error',
        'object-shorthand': 'error',
        'prefer-destructuring': ['error', {
            'array': true,
            'object': true
        }, {
            'enforceForRenamedProperties': false
        }],
        'no-param-reassign': ['error', {
            'props': true,
            'ignorePropertyModificationsFor': ['req', 'res', 'socket']
        }],
        'consistent-return': 'off',
        'no-await-in-loop': 'off',
        'import/no-dynamic-require': 'off',
        'global-require': 'off',
        'class-methods-use-this': 'off',
        'no-restricted-syntax': 'off'
    },
    overrides: [
        {
            files: ['**/*.test.js', '**/*.spec.js'],
            env: {
                jest: true
            },
            rules: {
                'no-unused-expressions': 'off'
            }
        }
    ]
};

