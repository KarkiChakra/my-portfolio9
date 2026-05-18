import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class ProductDAO {
    private final Connection connection;

    public ProductDAO(Connection connection) {
        this.connection = connection;
    }

    public void insertProduct(Product product) throws SQLException {
        String sql = """
                INSERT INTO products (product_name, product_code, price, stock_quantity, arrival_date)
                VALUES (?, ?, ?, ?, ?)
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, product.getProductName());
            statement.setString(2, product.getProductCode());
            statement.setBigDecimal(3, product.getPrice());
            statement.setInt(4, product.getStockQuantity());
            statement.setDate(5, Date.valueOf(product.getArrivalDate()));
            statement.executeUpdate();
        }
    }

    public void updateQuantity(String productCode, int stockQuantity) throws SQLException {
        String sql = """
                UPDATE products
                SET stock_quantity = ?
                WHERE product_code = ?
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, stockQuantity);
            statement.setString(2, productCode);
            statement.executeUpdate();
        }
    }

    public void deleteProduct(String productCode) throws SQLException {
        String sql = "DELETE FROM products WHERE product_code = ?";

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, productCode);
            statement.executeUpdate();
        }
    }

    public void insertArrivalHistory(String productCode, int quantity, LocalDate arrivalDate) throws SQLException {
        insertStockHistory(productCode, "ARRIVAL", quantity, arrivalDate);
    }

    public void insertShippingHistory(String productCode, int quantity) throws SQLException {
        insertStockHistory(productCode, "SHIPPING", quantity, LocalDate.now());
    }

    public List<Product> selectAllProduct() throws SQLException {
        String sql = """
                SELECT id, product_name, product_code, price, stock_quantity, arrival_date
                FROM products
                ORDER BY product_name ASC
                """;

        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(sql)) {
            return mapProducts(resultSet);
        }
    }

    public List<Product> searchProduct(String keyword) throws SQLException {
        String sql = """
                SELECT id, product_name, product_code, price, stock_quantity, arrival_date
                FROM products
                WHERE LOWER(product_name) LIKE LOWER(?)
                   OR LOWER(product_code) LIKE LOWER(?)
                ORDER BY product_name ASC
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            String searchText = "%" + keyword + "%";
            statement.setString(1, searchText);
            statement.setString(2, searchText);

            try (ResultSet resultSet = statement.executeQuery()) {
                return mapProducts(resultSet);
            }
        }
    }

    private void insertStockHistory(String productCode, String movementType, int quantity, LocalDate movementDate)
            throws SQLException {
        String sql = """
                INSERT INTO stock_history (product_code, movement_type, quantity, movement_date)
                VALUES (?, ?, ?, ?)
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, productCode);
            statement.setString(2, movementType);
            statement.setInt(3, quantity);
            statement.setDate(4, Date.valueOf(movementDate));
            statement.executeUpdate();
        }
    }

    private List<Product> mapProducts(ResultSet resultSet) throws SQLException {
        List<Product> products = new ArrayList<>();

        while (resultSet.next()) {
            Product product = new Product(
                    resultSet.getInt("id"),
                    resultSet.getString("product_name"),
                    resultSet.getString("product_code"),
                    resultSet.getBigDecimal("price"),
                    resultSet.getInt("stock_quantity"),
                    resultSet.getDate("arrival_date").toLocalDate()
            );
            products.add(product);
        }

        return products;
    }

    public static class Product {
        private final int id;
        private final String productName;
        private final String productCode;
        private final BigDecimal price;
        private final int stockQuantity;
        private final LocalDate arrivalDate;

        public Product(int id, String productName, String productCode, BigDecimal price, int stockQuantity,
                       LocalDate arrivalDate) {
            this.id = id;
            this.productName = productName;
            this.productCode = productCode;
            this.price = price;
            this.stockQuantity = stockQuantity;
            this.arrivalDate = arrivalDate;
        }

        public int getId() {
            return id;
        }

        public String getProductName() {
            return productName;
        }

        public String getProductCode() {
            return productCode;
        }

        public BigDecimal getPrice() {
            return price;
        }

        public int getStockQuantity() {
            return stockQuantity;
        }

        public LocalDate getArrivalDate() {
            return arrivalDate;
        }
    }
}
