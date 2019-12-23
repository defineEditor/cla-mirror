const queryString = require('query-string');

const wrapperRequest = async (params, cdiscLibrary) => {
    let paramsParsed = queryString.parse(params);
    let { format, traffic, productList, product, productDetails, itemGroup, listItemGroups } = paramsParsed;

    // JSON is used by default when the format is not specified
    if (!format) {
        format = 'json';
    }

    if (traffic !== undefined) {
        return cdiscLibrary.getTrafficStats();
    }

    if (productList !== undefined) {
        return cdiscLibrary.getProductList(format);
    }

    if (productDetails !== undefined) {
        return cdiscLibrary.getProductDetails({ type: 'long', format });
    }

    if (product) {
        let prodId = await cdiscLibrary.getProductIdByAlias(product);
        if (!prodId) {
            return `No such product (${product}). See /?productList or /?productDetails for the full list of products.`;
        }
        let prd = await cdiscLibrary.getFullProduct(product, true);

        if (listItemGroups !== undefined) {
            return prd.getItemGroups({ type: 'short', format });
        }

        if (itemGroup) {
            let dataset = await prd.getItemGroup(itemGroup);
            if (dataset !== undefined) {
                return dataset.getFormattedItems(format);
            } else {
                return `No such itemGroup (${itemGroup}). See /?product=XXX&listItemGroups to get the full list of itemGroups.`;
            }
        }
    }
};

module.exports = wrapperRequest;